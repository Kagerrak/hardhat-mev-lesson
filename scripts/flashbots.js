const {
  FlashbotsBundleProvider,
} = require("@flashbots/ethers-provider-bundle");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
require("dotenv").config();

const GOERLI_WS_URL = process.env.GOERLI_WS_URL;
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

async function main() {
  // Deploy FakeNFT Contract
  const fakeNFT = await ethers.getContractFactory("FakeNFT");
  const FakeNFT = await fakeNFT.deploy();
  await FakeNFT.deployed();

  console.log("Address of Fake NFT Contract: ", FakeNFT.address);

  // Create an ALchemy WenSocket Provider
  const provider = new ethers.providers.WebSocketProvider(
    GOERLI_WS_URL,
    "goerli"
  );

  // Wrap your private key in the ethers Wallet Clas
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Create a Flashbots Provider which will forward the request to the relayer
  // Which will further send it to the flashbot miner
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    signer,
    // URL for the flashbots relayer
    "https://relay-goerli.flashbots.net",
    "goerli"
  );

  provider.on("block", async (blockNumber) => {
    console.log("BlockNumber: ", blockNumber);
    // Send a bundle of transactions to the flashbot relayer
    const bundleResponse = await flashbotsProvider.sendBundle(
      [
        {
          transaction: {
            // ChainId for Goerli Network
            chainId: 5,
            // EIP-1559
            type: 2,
            //   Value of  1 FakeNFT
            value: ethers.utils.parseEther("0.01"),
            // Address of the FakeNFT
            to: FakeNFT.address,
            // In the data field, we pass the function selector of the mint function
            data: FakeNFT.interface.getSighash("mint()"),
            // Max Gas Fees you are willing to pay
            maxFeePerGas: BigNumber.from(10).pow(9).mul(3),
            // Max Priority gas fees you are willing to pay
            maxPriorityFeePerGas: BigNumber.from(10).pow(9).mul(2),
          },
          signer: signer,
        },
      ],
      blockNumber + 1
    );
    // If an error is present, log it
    if ("error" in bundleResponse) {
      console.log(bundleResponse.error.message);
    }
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main();
