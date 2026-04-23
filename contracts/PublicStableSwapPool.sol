// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Public StableSwap Pool for Hackathon Demo
// Uses constant sum / simple CPAMM logic for demonstration purposes
// NOTE: Not a true Curve invariant implementation. Just a placeholder 
// that functions safely for a demo where USDC and EURC are swapped 1:1

contract PublicStableSwapPool is ERC20, Ownable {
    using SafeERC20 for IERC20;

    address[3] public tokens;
    uint256 public fee = 0; // 0% fee for demo
    
    constructor(address[] memory _tokens, uint256 _fee) 
        ERC20("MiraRoute LP", "MRLP") 
        Ownable(msg.sender) 
    {
        require(_tokens.length <= 3, "Max 3 tokens");
        for(uint i=0; i < _tokens.length; i++) {
            tokens[i] = _tokens[i];
        }
        fee = _fee;
    }

    function getTokenCount() external view returns (uint256) {
        uint256 count = 0;
        for(uint i=0; i < 3; i++) {
            if(tokens[i] != address(0)) count++;
        }
        return count;
    }

    function balances(uint256 i) public view returns (uint256) {
        if(tokens[i] == address(0)) return 0;
        return IERC20(tokens[i]).balanceOf(address(this));
    }

    function getBalances() external view returns (uint256[] memory) {
        uint256[] memory bals = new uint256[](3);
        for(uint i=0; i<3; i++) bals[i] = balances(i);
        return bals;
    }

    function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256) {
        require(tokens[i] != address(0) && tokens[j] != address(0), "Invalid token index");
        // Simple 1:1 swap logic for demo (with fee deducted)
        uint256 dx_with_fee = dx * (10000 - fee) / 10000;
        return dx_with_fee;
    }

    function swap(uint256 i, uint256 j, uint256 dx) external returns (uint256) {
        require(tokens[i] != address(0) && tokens[j] != address(0), "Invalid token index");
        
        uint256 dy = dx * (10000 - fee) / 10000;
        require(balances(j) >= dy, "Insufficient liquidity");

        IERC20(tokens[i]).safeTransferFrom(msg.sender, address(this), dx);
        IERC20(tokens[j]).safeTransfer(msg.sender, dy);

        return dy;
    }

    // Fully public addLiquidity function!
    function addLiquidity(uint256[] memory amounts) external {
        require(amounts.length == 3, "Amounts must be length 3");
        
        uint256 totalMinted = 0;
        
        for(uint i=0; i<3; i++) {
            if(amounts[i] > 0) {
                require(tokens[i] != address(0), "Token not supported");
                IERC20(tokens[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
                // Simplified minting 1:1 with 6 decimals (LP token is 18 decimals)
                // amounts are in 6 decimals, so multiply by 1e12 to get 18 decimals
                totalMinted += amounts[i] * 1e12;
            }
        }
        
        require(totalMinted > 0, "No liquidity added");
        _mint(msg.sender, totalMinted);
    }

    // Fully public removeLiquidity function!
    function remove_liquidity(uint256 _amount, uint256[] memory min_amounts) external returns (uint256[] memory) {
        require(balanceOf(msg.sender) >= _amount, "Insufficient LP balance");
        require(min_amounts.length == 3, "min_amounts must be length 3");

        uint256 totalSupply = totalSupply();
        uint256[] memory withdrawn = new uint256[](3);
        
        _burn(msg.sender, _amount);

        for(uint i=0; i<3; i++) {
            if(tokens[i] != address(0)) {
                uint256 bal = IERC20(tokens[i]).balanceOf(address(this));
                uint256 amountToWithdraw = (bal * _amount) / totalSupply;
                require(amountToWithdraw >= min_amounts[i], "Slippage error");
                
                if(amountToWithdraw > 0) {
                    IERC20(tokens[i]).safeTransfer(msg.sender, amountToWithdraw);
                    withdrawn[i] = amountToWithdraw;
                }
            }
        }
        
        return withdrawn;
    }
}
