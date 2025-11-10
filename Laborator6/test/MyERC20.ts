import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Token contract", function () {
    it("Deployment should assign the total supply of tokens to the owner", async function () {
        const [owner, addr1] = await ethers.getSigners();

        const tokens = 1000
        const token = await ethers.deployContract("MyERC20", [tokens]);
        await token.waitForDeployment()

        const ownerBalance = await token.balanceOf(owner.address);
        expect(await token.totalSupply()).to.equal(ownerBalance);
    });


    it("Should transfer tokens between accounts", async function() {
        const [owner, addr1, addr2] = await ethers.getSigners();

        const tokens = 1000
        const token = await ethers.deployContract("MyERC20", [tokens]);
        await token.waitForDeployment()

        // Transfer 50 tokens from owner to addr1
        let transferTx = await token.connect(owner).transfer(addr1.address, 50);
        //wait for the transaction to be mined
        await transferTx.wait()

        expect(await token.balanceOf(addr1.address)).to.be.equal(50);

        // Transfer 50 tokens from addr1 to addr2
        transferTx = await token.connect(addr1).transfer(addr2.address, 50);
        await transferTx.wait()
        expect(await token.balanceOf(addr2.address)).to.be.equal(50);
    });

});