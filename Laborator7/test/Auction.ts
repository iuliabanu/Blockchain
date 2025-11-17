import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Re-entrancy Attack Tests", function () {
    let vulnerableAuction: any;
    let secureAuction: any;
    let attacker: any;
    let owner: any;
    let bidder1: any;
    let bidder2: any;
    let bidder3: any;

    beforeEach(async function () {
        [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();

        // Deploy vulnerable auction (vulnerable withdraw)
        vulnerableAuction = await ethers.deployContract("VulnerableAuction");
        await vulnerableAuction.waitForDeployment();

        // Deploy secure auction
        secureAuction = await ethers.deployContract("SecureAuction");
        await secureAuction.waitForDeployment();
    });

    describe("Vulnerable Auction - Re-entrancy Attack", function () {
        it("Should place bids normally", async function () {
            await vulnerableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await vulnerableAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });
            await vulnerableAuction.connect(bidder3).placeBid({ value: ethers.parseEther("1.5") });

            expect(await vulnerableAuction.highestBidder()).to.equal(bidder2.address);
            expect(await vulnerableAuction.highestBid()).to.equal(ethers.parseEther("2.0"));
        });

        it("VULNERABILITY: Should be exploited by re-entrancy attack", async function () {
            // Normal bidders place bids
            await vulnerableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await vulnerableAuction.connect(bidder2).placeBid({ value: ethers.parseEther("5.0") }); // Winner
            await vulnerableAuction.connect(bidder3).placeBid({ value: ethers.parseEther("2.0") });

            // Deploy attacker contract
            const vulnerableAuctionAddress = await vulnerableAuction.getAddress();
            attacker = await ethers.deployContract("Attacker", [vulnerableAuctionAddress]);
            await attacker.waitForDeployment();

            // Attacker places a bid (small amount)
            await attacker.bid({ value: ethers.parseEther("1.0") });

            // Check initial balances
            const contractBalanceBefore = await ethers.provider.getBalance(vulnerableAuctionAddress);
            const attackerBalanceBefore = await ethers.provider.getBalance(await attacker.getAddress());

            console.log("Contract balance before attack:", ethers.formatEther(contractBalanceBefore));
            console.log("Attacker balance before attack:", ethers.formatEther(attackerBalanceBefore));

            // End auction
            await vulnerableAuction.endAuction();

            // Execute re-entrancy attack
            const attackTx = await attacker.attack();
            await attackTx.wait();

            // Check balances after attack
            const contractBalanceAfter = await ethers.provider.getBalance(vulnerableAuctionAddress);
            const attackerBalanceAfter = await ethers.provider.getBalance(await attacker.getAddress());

            console.log("Contract balance after attack:", ethers.formatEther(contractBalanceAfter));
            console.log("Attacker balance after attack:", ethers.formatEther(attackerBalanceAfter));

            // Attacker should have stolen more than their original bid
            const stolen = attackerBalanceAfter - attackerBalanceBefore;
            console.log("Stolen amount:", ethers.formatEther(stolen));

            expect(stolen).to.be.greaterThan(ethers.parseEther("1.0"));

            // Contract should be drained significantly
            expect(contractBalanceAfter).to.be.lessThan(contractBalanceBefore);
        });

        it("Should show attacker's bid is not properly reset during attack", async function () {
            await vulnerableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("2.0") });
            await vulnerableAuction.connect(bidder2).placeBid({ value: ethers.parseEther("5.0") });

            const vulnerableAuctionAddress = await vulnerableAuction.getAddress();
            attacker = await ethers.deployContract("Attacker", [vulnerableAuctionAddress]);
            await attacker.waitForDeployment();

            await attacker.bid({ value: ethers.parseEther("1.0") });

            const attackerAddress = await attacker.getAddress();
            const bidBefore = await vulnerableAuction.bids(attackerAddress);
            expect(bidBefore).to.equal(ethers.parseEther("1.0"));

            await vulnerableAuction.endAuction();
            await attacker.attack();

            // Bid should be 0 after attack, but attacker withdrew multiple times
            const bidAfter = await vulnerableAuction.bids(attackerAddress);
            expect(bidAfter).to.equal(0n);
        });

    });

    describe("Secure Auction - Protected Against Re-entrancy", function () {
        it("Should place bids normally", async function () {
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });

            expect(await secureAuction.highestBidder()).to.equal(bidder2.address);
        });

        it("SECURE: Re-entrancy attack should fail", async function () {
            // Normal bidders
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("5.0") });
            await secureAuction.connect(bidder3).placeBid({ value: ethers.parseEther("2.0") });

            // Deploy attacker
            const secureAuctionAddress = await secureAuction.getAddress();
            attacker = await ethers.deployContract("Attacker", [secureAuctionAddress]);
            await attacker.waitForDeployment();

            // Attacker bids
            await attacker.bid({ value: ethers.parseEther("1.0") });

            await secureAuction.endAuction();

            // Attack should fail because state is updated before transfer
            await expect(attacker.attack()).to.be.revertedWith("Attack failed");

            // Contract balance should remain intact
            const finalBalance = await ethers.provider.getBalance(secureAuctionAddress);
            expect(finalBalance).to.equal(ethers.parseEther("9.0")); // 1 + 5 + 2 + 1
        });

        it("Should allow legitimate withdrawal after auction ends", async function () {
            await secureAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });
            await secureAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2.0") });

            await secureAuction.endAuction();

            const balanceBefore = await ethers.provider.getBalance(bidder1.address);
            const tx = await secureAuction.connect(bidder1).withdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const balanceAfter = await ethers.provider.getBalance(bidder1.address);

            expect(balanceAfter).to.equal(
                BigInt(balanceBefore) + BigInt(ethers.parseEther("1.0")) - BigInt(gasUsed)
            );

            // Second withdrawal should fail
            await expect(secureAuction.connect(bidder1).withdraw())
                .to.be.revertedWith("No funds to withdraw");
        });
    });
});