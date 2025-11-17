// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import "./Auction.sol";


contract AuctionFactory {
    address[] public allAuctions;
    mapping(address => address[]) public auctionsByCreator;
    mapping(address => AuctionInfo) public auctionInfo;

    struct AuctionInfo {
        address creator;
        uint256 createdAt;
        bool exists;
    }

    event AuctionCreated(
        address indexed auctionAddress,
        address indexed creator,
        uint256 timestamp
    );

    function createAuction(uint256 duration) external returns (address) {
        require(duration > 0, "Duration must be greater than 0");

        SecureAuction auction = new SecureAuction();
        address auctionAddress = address(auction);

        allAuctions.push(auctionAddress);
        auctionsByCreator[msg.sender].push(auctionAddress);
        auctionInfo[auctionAddress] = AuctionInfo({
            creator: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });

        emit AuctionCreated(auctionAddress, msg.sender, block.timestamp);

        return auctionAddress;
    }

    function getAuctionsByCreator(address creator)
    external
    view
    returns (address[] memory)
    {
        return auctionsByCreator[creator];
    }

    function getAllAuctions() external view returns (address[] memory) {
        return allAuctions;
    }

    function getAuctionCount() external view returns (uint256) {
        return allAuctions.length;
    }
}