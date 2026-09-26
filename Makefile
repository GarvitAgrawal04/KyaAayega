# Convenience wrappers. `make help` lists targets.
.PHONY: help install verify demo backtest readme sheet doctor synthetic clean
help:            ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  %-12s %s\n", $$1, $$2}'
install:         ## npm ci
	npm ci
verify:          ## types + hashes + look-ahead + reproduction + README + tests
	npm run verify
demo:            ## build the offline page and a sample Sheet
	npm run demo
backtest:        ## re-score the demo subject and write scoreboard.json
	npm run backtest
readme:          ## regenerate the README scoreboard block
	npm run readme
doctor:          ## environment + corpus health
	npm run kya -- doctor
synthetic:       ## regenerate the synthetic demo corpus
	npm run synthetic
clean:           ## remove generated artifacts
	rm -rf node_modules web/data.js web/sheets dist
