import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Voting", (m) => {
    const days = 10n;

    const voting = m.contract("Voting", [days]);

    return { voting };
});
