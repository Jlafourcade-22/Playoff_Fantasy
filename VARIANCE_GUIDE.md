# Enhanced Variance Model Guide

## Overview
The variance model now accounts for TWO sources of uncertainty:
1. **Advancement Variance**: Will the team advance to this round?
2. **Performance Variance**: How much will the player vary from projection if they play?

**Formula**: `Total Variance = (ProjectedPoints)² × p × (1-p) + p × (PlayerStdDev)²`

## Position Baselines (Standard Deviations)
- **QB**: 5.5 points (most consistent - high floor)
- **RB**: 8.5 points (moderate volatility - game script dependent)
- **WR**: 11.0 points (high volatility - target share variability)
- **TE**: 6.0 points (fairly consistent - limited upside)

## Player Adjustment Multipliers
Edit `data/playerStdDev.json` to customize volatility for specific players:

### High Volatility (Multiplier > 1.0)
Apply to:
- **Rookies** (limited NFL data): 1.2-1.5×
- **Boom/bust players** (inconsistent targets): 1.1-1.3×
- **Injury-prone** (snap count uncertainty): 1.1-1.2×
- **Committee backs** (unpredictable usage): 1.2-1.4×

Examples in current data:
```json
"Caleb Williams (GAY)": 1.5,    // Rookie QB
"Rome Odunze": 1.3,             // Rookie WR
"Kyle Monangai": 1.4,           // Rookie RB committee
"Quentin Johnston": 1.2,        // Boom/bust WR
"Christian Watson": 1.1         // Injury concerns
```

### Low Volatility (Multiplier < 1.0)
Apply to:
- **Target hogs** (consistent volume): 0.8-0.9×
- **Bell cow RBs** (guaranteed touches): 0.85-0.95×
- **Veterans with stable roles**: 0.85-0.95×

Examples in current data:
```json
"Courtland Sutton": 0.9,        // WR1, consistent targets
"Cooper Kupp": 0.85             // Veteran slot WR, stable role
```

## How to Update

### Step 1: Edit Player Adjustments
Edit `data/playerStdDev.json`:
```json
{
  "playerAdjustments": {
    "Player Name": 1.2,  // 20% more volatile
    "Another Player": 0.85  // 15% less volatile
  }
}
```

### Step 2: Recalculate Variance
```bash
node data/calculateEnhancedVariance.js
```

### Step 3: Update Win Probabilities
```bash
node data/calculateWinProbabilities.js
```

## Team Statistics Interpretation

After running calculations, you'll see:
- **Expected Value**: Total projected points across all rounds
- **Standard Deviation**: Overall uncertainty (lower = safer)
- **Coefficient of Variation**: Relative risk (σ/EV × 100%)

Example:
```
Colin Quality Learing Center:
  Expected Value: 215.8 points
  Standard Deviation: 46.0 points
  Coefficient of Variation: 21.3%
```

**CV Interpretation**:
- <20%: Very safe team (consistent scorers)
- 20-25%: Moderate risk (typical)
- >25%: High risk/reward (boom or bust roster)

## Impact on Win Probabilities

The enhanced model creates more realistic simulations:
- **Before**: All players had uniform σ=8 (unrealistic)
- **After**: QBs σ≈5.5, RBs σ≈8.5, WRs σ≈11, with player-specific adjustments

This means:
- Teams with rookie WRs see increased variance
- Teams with veteran QBs see reduced variance
- Win probabilities better reflect actual uncertainty
