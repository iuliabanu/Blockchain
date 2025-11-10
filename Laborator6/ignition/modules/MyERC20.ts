import { buildModule }  from "@nomicfoundation/hardhat-ignition/modules";

const TOKENS = 1000;

export default buildModule("MyERC20Module", (m) => {
    const tokens = m.getParameter("tokens", TOKENS);

    const erc20 = m.contract("MyERC20", [tokens]);

    return { erc20 };
});