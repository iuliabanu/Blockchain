import { expect } from "chai";
import { AddressLike, Typed } from "ethers";
import {network} from "hardhat";

const {ethers} = await network.connect();

describe("FidelityPoints", function () {
    let signers: { address: AddressLike | Typed; }[] = [];

    before(async function () {
        signers = await ethers.getSigners();
    });

    it("The sum of the addPoints should match the totalPoints value", async function () {
        const fidelityPoints = await ethers.deployContract("FidelityPoints", [7n]);

        for (let i = 1; i <= 10; i++) {
            await fidelityPoints.addPoints(signers[i].address, 2n);
        }

        const totalPoints = await fidelityPoints.getTotalPoints();

        // Check that totalPoints matches expected sum
        const expectedTotal = 20n;
        expect(totalPoints).to.equal(expectedTotal);

    });
});