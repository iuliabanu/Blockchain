// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;


contract SecureAuction {
    mapping(address => uint256) public bids;
    mapping(address => uint256) public pendingReturns;
    address public highestBidder;
    uint256 public highestBid;
    bool public auctionEnded;

    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);
    event Withdrawal(address indexed bidder, uint256 amount);

    function placeBid() external payable {
        require(!auctionEnded, "Auction already ended");
        require(msg.value > 0, "Bid must be greater than 0");

        bids[msg.sender] += msg.value;

        if (bids[msg.sender] > highestBid) {
            highestBidder = msg.sender;
            highestBid = bids[msg.sender];
        }

        emit BidPlaced(msg.sender, msg.value);
    }

    function endAuction() external {
        require(!auctionEnded, "Auction already ended");
        require(highestBidder != address(0), "No bids placed");

        auctionEnded = true;

        emit AuctionEnded(highestBidder, highestBid);
    }

    function withdraw() external {
        require(auctionEnded, "Auction not ended yet");
        require(msg.sender != highestBidder, "Winner cannot withdraw");

        uint256 refundAmount = bids[msg.sender];
        require(refundAmount > 0, "No funds to withdraw");

        bids[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Withdrawal failed");

        emit Withdrawal(msg.sender, refundAmount);
    }

    function claimPrize() external {
        require(auctionEnded, "Auction not ended yet");
        require(msg.sender == highestBidder, "Only winner can claim");
        require(highestBid > 0, "Already claimed");

        uint256 prizeAmount = highestBid;
        highestBid = 0; // Prevent re-entrancy

        (bool success, ) = msg.sender.call{value: prizeAmount}("");
        require(success, "Prize claim failed");
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}