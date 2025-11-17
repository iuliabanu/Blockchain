import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Token contract", function () {

    let token: any;
    let owner: any;
    let addr1: any;
    let addr2: any;
    const tokens = 1000n;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        token = await ethers.deployContract("MyERC20", [tokens]);
        await token.waitForDeployment();
    });



    it("Deployment should assign the total supply of tokens to the owner", async function () {

        const ownerBalance = await token.balanceOf(owner.address);
        expect(await token.totalSupply()).to.equal(ownerBalance);
    });


    it("Should transfer tokens between accounts", async function() {

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

    // checkBalance modifier - should revert on insufficient balance
    it("Should revert transfer when balance is insufficient (checkBalance modifier)", async function() {

        // Try to transfer more tokens than available
        await expect(
            token.connect(owner).transfer(addr1.address, 1001)
        ).to.be.revertedWith("Insufficient funds!");
    });

    it("Should emit Transfer event on transfer", async function() {
        await expect(token.connect(owner).transfer(addr1.address, 100n))
            .to.emit(token, "Transfer")
            .withArgs(owner.address, addr1.address, 100n);
    });
});