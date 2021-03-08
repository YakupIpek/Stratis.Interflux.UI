class Model {
  constructor() {
    this.connected = ko.observable(false);
    this.connecting = ko.observable(false);
    this.metaMaskInstalled = ko.observable();
    this.account = ko.observable('');
    this.amount = ko.observable();
    this.balance = ko.observable(0);
    this.contractAddress = "0x9d9a8d5a62b62367a850a3322a29ca64bb1626ed";
  }

  install() {
    const url = 'http://localhost:9010';
    const onboarding = new MetamaskOnboarding({ url });
    onboarding.startOnboarding();
  }

  async connect() {
      this.connecting(true);
      await ethereum.request({ method: 'eth_requestAccounts' }).then(data => this.connecting(false));
      this.connected(true);
      $('.collapse').collapse();

      await this.getAccount();
  }

  async getAccount() {
    var accounts = await ethereum.request({ method: 'eth_accounts' });
    this.account(accounts[0]);
    var balance = await this.contract.methods.balanceOf(this.account()).call();
    var n = 10n ** 10n;
    balance = (BigInt(balance) / n) * n + 30n * n;
    balance = Web3.utils.fromWei(balance.toString(), "ether");
    this.balance(balance);
  }

  get web3() {
    return new Web3(Web3.givenProvider);
  }
  get contract() {
    return new this.web3.eth.Contract(contractMetadata, this.contractAddress);
  }

  async setBalance() {
    this.amount(this.balance());
  }

  async burnTokens() {
    var amount = "0";
    var address = "qWSL5GZsYfiuEHRgMJT5XUS3k9WsWETcKS";
    var tx = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: this.account(),
          to: this.contractAddress,
          value: this.web3.utils.fromDecimal(0),
          //gas: this.web3.utils.fromDecimal(21000),
          data: this.contract.methods.burn(amount, address).encodeABI(),
          chainId: '0x3' // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
        }
      ]
    });
  }
}

var model = new Model();
ko.applyBindings(model);

window.addEventListener('DOMContentLoaded', () => {
  model.metaMaskInstalled(MetamaskOnboarding.isMetaMaskInstalled());
});
