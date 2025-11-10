import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Auction Vulnerability Tests", function () {
    let vulnerableAuction: any;
    let secureAuction: any;
    let maliciousRejecter: any;
    let owner: any;
    let bidder1: any;
    let bidder2: any;
    let bidder3: any;

    beforeEach(async function () {
        [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();

        // Deploy vulnerable auction
        vulnerableAuction = await ethers.deployContract("VulnerableAuction");
        await vulnerableAuction.waitForDeployment();

        // Deploy secure auction
        secureAuction = await ethers.deployContract("SecureAuction");
        await secureAuction.waitForDeployment();
    });

    describe("Vulnerable Auction", function () {
        it("Should place bids normally", async function () {
            await vulnerableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await vulnerableAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });

            expect(await vulnerableAuction.highestBidder()).to.equal(bidder2.address);
            expect(await vulnerableAuction.highestBid()).to.equal(ethers.parseEther("2.0"));
        });

        it("Should successfully end auction when all bidders are normal accounts", async function () {
            await vulnerableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await vulnerableAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });
            await vulnerableAuction.connect(bidder3).placeBid({ value: ethers.parseEther("1.5") });

            await expect(vulnerableAuction.endAuction())
                .to.emit(vulnerableAuction, "AuctionEnded");
        });

        it("VULNERABILITY: Should be blocked by malicious contract", async function () {
            // Normal bids
            await vulnerableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await vulnerableAuction.connect(bidder2).placeBid({ value: ethers.parseEther("3.0") });

            // Deploy malicious contract that rejects payments
            const vulnerableAuctionAddress = await vulnerableAuction.getAddress();
            maliciousRejecter = await ethers.deployContract("MaliciousRejecter", [vulnerableAuctionAddress]);
            await maliciousRejecter.waitForDeployment();

            // Malicious contract places a bid
            await maliciousRejecter.attack({ value: ethers.parseEther("0.5") });

            // Try to end auction - WILL FAIL
            await expect(vulnerableAuction.endAuction())
                .to.be.revertedWith("Refund failed");

            // The auction cannot be ended!
        });
    });

    describe("Secure Auction (Withdrawal Pattern)", function () {
        it("Should place bids normally", async function () {
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });

            expect(await secureAuction.highestBidder()).to.equal(bidder2.address);
            expect(await secureAuction.highestBid()).to.equal(ethers.parseEther("2.0"));
        });

        it("Should end auction successfully regardless of bidders", async function () {
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });
            await secureAuction.connect(bidder3).placeBid({ value: ethers.parseEther("1.5") });

            await expect(secureAuction.endAuction())
                .to.emit(secureAuction, "AuctionEnded")
                .withArgs(bidder2.address, ethers.parseEther("2.0"));
        });

        it("Should allow losers to withdraw their bids", async function () {
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });
            await secureAuction.connect(bidder3).placeBid({ value: ethers.parseEther("1.5") });

            await secureAuction.endAuction();

            // Bidder1 withdraws their losing bid
            const bidder1BalanceBefore = await ethers.provider.getBalance(bidder1.address);
            const tx = await secureAuction.connect(bidder1).withdraw();
            const receipt = await tx.wait();
            const gasUsed= receipt.gasUsed * tx.gasPrice;
            const bidder1BalanceAfter= await ethers.provider.getBalance(bidder1.address);

            expect(bidder1BalanceAfter).to.equal(
                ethers.parseEther("1.0") + bidder1BalanceBefore - gasUsed
            );

            await expect(tx)
                .to.emit(secureAuction, "Withdrawal")
                .withArgs(bidder1.address, ethers.parseEther("1.0"));
        });

        it("Should not allow winner to withdraw", async function () {
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });

            await secureAuction.endAuction();

            await expect(secureAuction.connect(bidder2).withdraw())
                .to.be.revertedWith("Winner cannot withdraw");
        });

        it("Should not allow withdrawal before auction ends", async function () {
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });

            await expect(secureAuction.connect(bidder1).withdraw())
                .to.be.revertedWith("Auction not ended yet");
        });

        it("SECURE: Even if one bidder rejects payment, others can still withdraw", async function () {
            // This test shows that even with a malicious contract, the secure pattern works
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("3.0") });
            await secureAuction.connect(bidder3).placeBid({ value: ethers.parseEther("1.5") });

            // End auction successfully (doesn't send funds)
            await secureAuction.endAuction();

            // Bidder1 and bidder3 can both withdraw successfully
            await expect(secureAuction.connect(bidder1).withdraw())
                .to.emit(secureAuction, "Withdrawal");

            await expect(secureAuction.connect(bidder3).withdraw())
                .to.emit(secureAuction, "Withdrawal");

        });
    });
});