# cycle-events
Provides event-based pub/sub to cycle.js applications.

## Installation
`npm i cycle-driver --save`

## Scripts
To generate documentation: `npm run doc`. This will create documentation in the
`build/docs` folder.

## TODO
 - generate markdown from jsdocs (a la bauer) and add to readme
 - delete node_modules folder, commit gitignore, then run npm install again
 - unit test
   - add/remove/emit before listeners are added
   - removing handler during emit doesn't skip subsequent handlers 
 - create cycle driver / integrate observables