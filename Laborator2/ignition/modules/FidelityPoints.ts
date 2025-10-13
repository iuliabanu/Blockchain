import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FidelityPointsModule", (m) => {
    const pointValue = 7n;

    const fidelityPoints = m.contract("FidelityPoints", [pointValue]);

    m.call(fidelityPoints, "setPointValue", [10n]);

    return { fidelityPoints };
});
