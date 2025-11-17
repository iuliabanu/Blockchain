import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Auction Factory Pattern", function () {
    let factory: any;
    let owner: any;
    let creator1: any;
    let creator2: any;

    beforeEach(async function () {
        [owner, creator1, creator2] = await ethers.getSigners();

        factory = await ethers.deployContract("AuctionFactory");
        await factory.waitForDeployment();
    });

    it("Should create a new auction", async function () {
        const tx = await factory.connect(creator1).createAuction(86400); // 1 day
        const receipt = await tx.wait();

        expect(await factory.getAuctionCount()).to.equal(1);
    });

    it("Should track auctions by creator", async function () {
        await factory.connect(creator1).createAuction(86400);
        await factory.connect(creator1).createAuction(172800);
        await factory.connect(creator2).createAuction(86400);

        const creator1Auctions = await factory.getAuctionsByCreator(creator1.address);
        const creator2Auctions = await factory.getAuctionsByCreator(creator2.address);

        expect(creator1Auctions.length).to.equal(2);
        expect(creator2Auctions.length).to.equal(1);
    });

    it("Should emit AuctionCreated event", async function () {
        await expect(factory.connect(creator1).createAuction(86400))
            .to.emit(factory, "AuctionCreated");
    });
});