.DEFAULT_GOAL := help

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

check: ## Validate the marketplace and both plugins
	claude plugin validate .
	claude plugin validate plugins/stazelabs
	claude plugin validate plugins/stazelabs-go

.PHONY: help check
