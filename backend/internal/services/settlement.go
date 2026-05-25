package services

import "math"

// SettlementResult represents a single payment transaction
type SettlementResult struct {
	From   string  `json:"from"`
	To     string  `json:"to"`
	Amount float64 `json:"amount"`
}

// CalculateSettlements uses a greedy algorithm to minimize the number of transactions
// balances map: userID -> net balance (positive = owed money, negative = owes money)
func CalculateSettlements(balances map[string]float64) []SettlementResult {
	type person struct {
		id     string
		amount float64
	}

	var creditors []person // owed money (balance > 0)
	var debtors []person   // owe money  (balance < 0)

	for id, bal := range balances {
		if bal > 0.01 {
			creditors = append(creditors, person{id, bal})
		} else if bal < -0.01 {
			debtors = append(debtors, person{id, math.Abs(bal)})
		}
	}

	var results []SettlementResult
	i, j := 0, 0

	for i < len(debtors) && j < len(creditors) {
		debtor := &debtors[i]
		creditor := &creditors[j]

		amount := math.Min(debtor.amount, creditor.amount)
		results = append(results, SettlementResult{
			From:   debtor.id,
			To:     creditor.id,
			Amount: math.Round(amount*100) / 100,
		})

		debtor.amount -= amount
		creditor.amount -= amount

		if debtor.amount < 0.01 {
			i++
		}
		if creditor.amount < 0.01 {
			j++
		}
	}

	return results
}
