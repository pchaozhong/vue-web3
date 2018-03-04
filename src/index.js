import Web3 from 'web3'

export default (Vue, options) => {

  let web3 = options.web3 || new Web3(options.provider)
  let callsToCheck = []

  web3.eth.subscribe('newBlockHeaders', onNewBlockHeader).on('data', onNewBlockHeaderData)

  function onNewBlockHeader(error, result) {
    // console.log(error, result)
  }

  async function onNewBlockHeaderData(blockHeader) {
    if (! blockHeader.number) return

    let block = await web3.eth.getBlock(blockHeader.number, true)
    
    let addressesToCheck = callsToCheck.map(call => call.contract.address)

    let relevant = block.transactions.filter(txn => {
      return addressesToCheck.includes(txn.to.toLowerCase())
    })

    let addressesToCall = relevant.map(txn => txn.to.toLowerCase())

    let callsToMake = callsToCheck.filter(call => addressesToCall.includes(call.contract.address))

    callsToMake.forEach(call => bindCall(call.vm, call.key, { method: call.method, contract: call.contract }))
  }

  async function onEvent(err, event) {
    console.log('onEvent', { err, event })
  }

  async function onEventData(event) {
    console.log('onEventData', { event })
  }

  async function onEventChanged(event) {
    console.log('onEventChanged', { event })
  }

  async function bindCall(vm, key, { method, contract }) {
    let value = await contract.methods[method]().call()
    vm[key] = value
    vm.$emit('CALL_MADE')
  }

  Vue.prototype.$bindCall = async function (key, { method, contract }) {
    callsToCheck.push({
      vm: this,
      key,
      method,
      contract
    })

    await bindCall(this, key, { method, contract })
  }

  Vue.prototype.$bindEvents = async function (key, { event, contract, options }) {
    contract.events[event](options, (err, e) => {
      this[key].push(e)
      this.$emit('EVENT_SYNCED', e)
    })
  }
}