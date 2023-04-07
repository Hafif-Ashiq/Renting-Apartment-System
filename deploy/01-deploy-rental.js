const { network, ethers } = require("hardhat");
const { verify } = require("../utils/verify");
const { developmentChains } = require("../hardhat.config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  log("Deployingg...");
  const rentalContract = await deploy("RentalContract", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  log("Deployed...");

  log("-------------------------------------------\n");

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying.....");
    await verify(rentalContract.address, []);
  }
  log("-------------------------------------------\n");
};

module.exports.tags = ["Rental", "all"];
