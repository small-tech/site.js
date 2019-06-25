const test = require('tape')
const cli = require('../bin/lib/cli')

const path = require('path')

test('[CLI] command parsing', t => {

  var {commandPath, args} = cli.initialise([])
  t.ok(commandPath.includes('serve'), 'Syntax: site → command is serve')
  t.ok(args.positional.length === 0, 'there are no positional arguments')
  t.ok(Object.keys(args.named).length === 0, 'there are no named arguments')

  var {commandPath, args} = cli.initialise(['test/site'])
  t.ok(commandPath.includes('serve'), 'Syntax: site → command is serve')
  t.ok(args.positional.length === 1, 'there is one positional argument')
  t.strictEqual(args.positional[0], 'test/site', 'The first positional argument is the path to serve')
  t.ok(Object.keys(args.named).length === 0, 'there are no named arguments')

  var {commandPath, args} = cli.initialise(['serve'])
  t.ok(commandPath.includes('serve'), 'Syntax: site serve → command is serve')
  t.ok(args.positional.length === 0, 'there are no positional arguments')
  t.ok(Object.keys(args.named).length === 0, 'there are no named arguments')

  var {commandPath, args} = cli.initialise(['serve', 'test/site'])
  t.ok(commandPath.includes('serve'), 'Syntax: site serve test/site → command is serve')
  t.ok(args.positional.length === 1, 'there is one positional argument')
  t.strictEqual(args.positional[0], 'test/site', 'The first positional argument is the path to serve')
  t.ok(Object.keys(args.named).length === 0, 'there are no named arguments')


  t.end()
})