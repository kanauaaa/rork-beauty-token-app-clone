// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract BPSBT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct BPData {
        uint256 bpAmount;
        string category;
        uint256 timestamp;
    }

    mapping(uint256 => BPData) private _bpData;
    mapping(address => uint256) private _totalBP;
    mapping(address => mapping(string => uint256)) private _categoryBP;

    event BPMinted(address indexed to, uint256 tokenId, uint256 bpAmount, string category);

    constructor() ERC721("Beauty Point SBT", "BPSBT") Ownable(msg.sender) {}

    function mintBP(
        address to,
        uint256 bpAmount,
        string memory category
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(to, newTokenId);

        _bpData[newTokenId] = BPData({
            bpAmount: bpAmount,
            category: category,
            timestamp: block.timestamp
        });

        _totalBP[to] += bpAmount;
        _categoryBP[to][category] += bpAmount;

        emit BPMinted(to, newTokenId, bpAmount, category);

        return newTokenId;
    }

    function getBPData(uint256 tokenId)
        public
        view
        returns (
            uint256 bpAmount,
            string memory category,
            uint256 timestamp
        )
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        BPData memory data = _bpData[tokenId];
        return (data.bpAmount, data.category, data.timestamp);
    }

    function getTotalBP(address owner) public view returns (uint256) {
        return _totalBP[owner];
    }

    function getBPByCategory(address owner, string memory category)
        public
        view
        returns (uint256)
    {
        return _categoryBP[owner][category];
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0) && to != address(0)) {
            revert("SBT: Transfer not allowed");
        }

        return super._update(to, tokenId, auth);
    }
}
