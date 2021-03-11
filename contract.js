class Model {
  constructor() {
    this.connected = ko.observable(false);
    this.connecting = ko.observable(false);
    this.metaMaskInstalled = ko.observable();
    this.account = ko.observable('');
    this.address = ko.observable();
    this.amount = ko.observable();
    this.balance = ko.observable(0);
    this.tx = ko.observable();
    this.toast = $('.toast').toast({ autohide: false });
    this.contract = null;
    this.web3 = null;
    this.chainId = null;
    this.account = ko.observable();
    this.networks = {};

    this.submitAttempted = ko.observable(false);
    this.isInValidAddress = ko.computed(() => this.submitAttempted() ? !this.isValidAddress() : null);
    this.isInValidAmount = ko.computed(() => this.submitAttempted() ? !this.isValidAmount() : null);

    if (window.ethereum) {
      ethereum.on('accountsChanged', async accounts => await this.updateAccount(accounts));
      ethereum.on('chainChanged', chainId => window.location.reload());
    }
  }

  get network() {
    this.networks = {
      '0x1': {
        name: 'Mainnet',
        contractAddress: '0xa61AB12Eb1964C5b478283d3233270800674aCe0',
        txUrl: txid => 'https://etherscan.io/tx/' + txid,
        validateAddress: address => {
          try {
            var result = base58Check.decode(address);
            return result.prefix[0] == 75;
          } catch (e) {
            return false;
          }
        }
      },
      '0x3': {
        name: 'Ropsten',
        contractAddress: '0x9d9a8d5a62b62367a850a3322a29ca64bb1626ed',
        txUrl: txid => 'https://ropsten.etherscan.io/tx/' + txid,
        validateAddress: address => {
          try {
            var result = base58Check.decode(address);
            return result.prefix[0] == 120;
          } catch (e) {
            return false;
          }
        }
      }
    };

    return this.networks[this.chainId];
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


    this.chainId = await ethereum.request({ method: 'eth_chainId' });
    var accounts = await ethereum.request({ method: 'eth_accounts' });
    this.web3 = new Web3(Web3.givenProvider);
    this.contract = new this.web3.eth.Contract(contractMetadata, this.network.contractAddress);

    await this.updateAccount(accounts);
  }

  async updateAccount(accounts) {
    this.account(accounts[0]);
    await this.refreshBalance();
  }

  async refreshBalance() {
    var balance = await this.contract.methods.balanceOf(this.account()).call();
    var n = 10n ** 10n;
    balance = (BigInt(balance) / n) * n + 30n * n;
    balance = Web3.utils.fromWei(balance.toString(), "ether");
    this.balance(balance);
  }

  setBalance() {
    this.amount(this.balance());
  }

  async burnTokens() {
    this.submitAttempted(true);
    if (!this.isValidForm()) {
      return;
    }

    var amount = this.toWei(this.amount())
    var txid = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: this.account(),
          to: this.network.contractAddress,
          value: this.web3.utils.fromDecimal(0),
          data: this.contract.methods.burn(amount, this.address()).encodeABI()
        }
      ]
    });

    this.tx({
      id: txid,
      amount: this.amount(),
      url: this.network.txUrl(txid)
    })
    this.toast.toast("show");

    this.amount(null);
    this.address(null);
    this.submitAttempted(false);
    setTimeout(() => this.refreshBalance(), 5000);
  }

  isValidForm() {
    return this.isValidAddress() && this.isValidAmount();
  }

  isValidAddress() {
    return this.network.validateAddress(this.address());
  }

  isValidAmount() {
    var amount = BigInt(this.toWei(this.amount() || "0"));
    var balance = BigInt(this.toWei(this.balance()));
    return amount > 0 && amount <= balance;
  }

  toWei(amount) {
    return Web3.utils.toWei(amount, "ether");
  }
}

var model = new Model();

window.addEventListener('DOMContentLoaded', () => {
  ko.applyBindings(model);
  model.metaMaskInstalled(MetamaskOnboarding.isMetaMaskInstalled());

  $('[data-toggle="tooltip"]').tooltip();
});
