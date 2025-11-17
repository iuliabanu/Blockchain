import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();


describe("Proxy Pattern - Upgradeability", function () {
    let proxy: any;
    let implV1: any;
    let implV2: any;
    let admin: any;
    let bidder1: any;
    let bidder2: any;

    beforeEach(async function () {
        [admin, bidder1, bidder2] = await ethers.getSigners();

        // Deploy V1 implementation
        implV1 = await ethers.deployContract("AuctionImplementationV1");
        await implV1.waitForDeployment();

        // Deploy proxy pointing to V1
        proxy = await ethers.deployContract("AuctionProxy", [await implV1.getAddress()]);
        await proxy.waitForDeployment();

        // Deploy V2 implementation
        implV2 = await ethers.deployContract("AuctionImplementationV2");
        await implV2.waitForDeployment();
    });

    it("Should work with V1 implementation", async function () {
        const auctionV1 = await ethers.getContractAt("AuctionImplementationV1", await proxy.getAddress());

        await auctionV1.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });

        expect(await auctionV1.highestBid()).to.equal(ethers.parseEther("1.0"));
        expect(await auctionV1.highestBidder()).to.equal(bidder1.address);
    });

    it("Should upgrade to V2 and preserve state", async function () {
        const auctionV1 = await ethers.getContractAt("AuctionImplementationV1", await proxy.getAddress());

        // Place bid with V1
        await auctionV1.connect(bidder1).placeBid({ value: ethers.parseEther("2.0") });

        // Upgrade to V2
        await proxy.connect(admin).upgradeTo(await implV2.getAddress());

        const auctionV2 = await ethers.getContractAt("AuctionImplementationV2", await proxy.getAddress());

        // State should be preserved
        expect(await auctionV2.highestBid()).to.equal(ethers.parseEther("2.0"));
        expect(await auctionV2.highestBidder()).to.equal(bidder1.address);
    });

    it("Should have new features in V2", async function () {
        await proxy.connect(admin).upgradeTo(await implV2.getAddress());

        const auctionV2 = await ethers.getContractAt("AuctionImplementationV2", await proxy.getAddress());

        // Set minimum bid (new feature)
        await auctionV2.connect(admin).setMinimumBid(ethers.parseEther("0.5"));

        // Bid below minimum should fail
        await expect(
            auctionV2.connect(bidder1).placeBid({ value: ethers.parseEther("0.1") })
        ).to.be.revertedWith("Bid below minimum");

        // Bid above minimum should work
        await auctionV2.connect(bidder1).placeBid({ value: ethers.parseEther("1.0") });

        // Check new getBidStats function
        const stats = await auctionV2.getBidStats(bidder1.address);
        expect(stats.total).to.equal(ethers.parseEther("1.0"));
        expect(stats.count).to.equal(1n);
    });

    it("Should only allow admin to upgrade", async function () {
        await expect(
            proxy.connect(bidder1).upgradeTo(await implV2.getAddress())
        ).to.be.revertedWith("Only admin can upgrade");
    });
});