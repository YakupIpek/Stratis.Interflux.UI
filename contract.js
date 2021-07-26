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
    this.web3 = new Web3(Web3.givenProvider);
    this.chainId = null;
    this.account = ko.observable();
    this.submitAttempted = ko.observable(false);
    this.isInValidAddress = ko.computed(() => this.submitAttempted() ? !this.isValidAddress() : null);
    this.isInValidAmount = ko.computed(() => this.submitAttempted() ? !this.isValidAmount() : null);
    this.networkName = ko.computed(() => this.connected() ? this.network.name : null);
    if (window.ethereum) {
      ethereum.on('accountsChanged', accounts => this.updateAccount(accounts));
      ethereum.on('chainChanged', chainId => window.location.reload());
    }
  }

  install() {
    const url = 'http://localhost:9010';
    const onboarding = new MetamaskOnboarding({ url });
    onboarding.startOnboarding();
  }

  async connect() {
    try {
      this.connecting(true);
      var accounts = await ethereum.request({ method: 'eth_requestAccounts' });

      this.chainId = await ethereum.request({ method: 'eth_chainId' });

      this.contract = new this.web3.eth.Contract(contractMetadata, this.network.contractAddress);

      await this.updateAccount(accounts);

      this.connected(true);
      $('.collapse').collapse('toggle');

    } catch { }

    this.connecting(false);

  }

  validateAddress(address, prefix) {
    try {
      var result = base58Check.decode(address);
      return result.prefix[0] == prefix;
    } catch (e) {
      return false;
    }
  }

  get network() {

    var networks = {
      '0x1': {
        name: 'Main',
        contractAddress: '0xa3c22370de5f9544f0c4de126b1e46ceadf0a51b',
        txUrl: txid => 'https://etherscan.io/tx/' + txid,
        validateAddress: address => this.validateAddress(address, 75)
      },
      '0x3': {
        name: 'Ropsten',
        contractAddress: '0x9d9a8d5a62b62367a850a3322a29ca64bb1626ed',
        txUrl: txid => 'https://ropsten.etherscan.io/tx/' + txid,
        validateAddress: address => this.validateAddress(address, 120)
      }
    };

    return networks[this.chainId];
  }

  async updateAccount(accounts) {
    if(accounts.length == 0)
    {
      this.connected(false);
      $('.collapse').collapse('hide');
      return;
    }
    this.account(accounts[0]);
    await this.refreshBalance();
  }

  async refreshBalance() {
    var balance = await this.contract.methods.balanceOf(this.account()).call();
    var n = 10n ** 10n;
    balance = (BigInt(balance) / n) * n;//drop value under satoshi
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

  async addWallet() {
    await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: model.network.contractAddress,
          symbol: 'WSTRAX',
          decimals: 18,
          image: 'https://www.stratisplatform.com/wp-content/themes/stratis-platform/resources/images/logo-gradient-alt.svg',
        },
      },
    });
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
