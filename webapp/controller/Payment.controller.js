sap.ui.define([
	"com/csr/order/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/csr/order/model/formatter",
	"com/csr/order/util/OrderServiceUtil",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/HTML",
	"sap/m/Dialog",
	"sap/m/library",	//Neo to Cloud Foundry change by FAIR TEAM
	//"sap/m/DialogType",	//Neo to Cloud Foundry change by FAIR TEAM
	"sap/m/Button",
	//"sap/m/ButtonType",	//Neo to Cloud Foundry change by FAIR TEAM
	"sap/ui/core/routing/History"
], function (BaseController, JSONModel, formatter, OrderServiceUtil, MessageBox, MessageToast, Html, Dialog, mobileLibrary, Button, History) {
	"use strict";
	//Neo to Cloud Foundry change by FAIR TEAM
	// shorthand access to the enums that used to be loaded as separate,
	// now-deprecated modules ("sap/m/DialogType", "sap/m/ButtonType")
	var DialogType = mobileLibrary.DialogType;
	var ButtonType = mobileLibrary.ButtonType;
	//Neo to Cloud Foundry change by FAIR TEAM
	return BaseController.extend("com.csr.order.controller.Payment", {
		aErrorMessages: [],
		formatter: formatter,
		OrderServiceUtil: OrderServiceUtil,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.csr.order.view.Payment
		 */
		onInit: function () {
			var oViewModel = this.createViewModel();
			this.getView().setModel(oViewModel, "paymentViewModel");

			//Local testing for receive payments functionality
			// this.getOwnerComponent().getModel("customerCockpitModel").setProperty("/receivePaymentOrder", "303449482");

			if (this.getOwnerComponent().getModel("customerCockpitModel").getProperty("/receivePaymentOrder") !== "") {
				this.getOwnerComponent().getRouter().getRoute("Payment").attachPatternMatched(this.onObjectMatchedReceivePayment, this);
			} else {
				this.getOwnerComponent().getRouter().getRoute("Payment").attachPatternMatched(this.onObjectMatched, this);
			}
			this.oEventBus = this.getEventBus();
		},

		createViewModel: function () {
			return new JSONModel({
				"delay": 0,
				"busy": false,
				"CardSet": [],
				"CashSet": [{}],
				"PrintReceipt": true,
				"EmailReceipt": false,
				"changeAmount": "0.00",
				"displayBackButton": true,
				"countryCode": this.getOwnerComponent().getModel("countryModel").getProperty("/countryCode"), //C5267297 - disable CC fileds for NZ
				"isCashEditable": true
			});
		},
		onObjectMatched: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			oViewModel.setProperty("/busy", true);
			var totalAmount = orderHeaderModel.getProperty("/totalAmount");
			var email = cartHeaderModel.getProperty("/email");
			oViewModel.setProperty("/totalAmount", totalAmount);
			oViewModel.setProperty("/payableAmount", totalAmount);
			oViewModel.setProperty("/paid", "0.00");
			if (email) {
				oViewModel.setProperty("/email", email);
			}
			this.getAssestID();
			this.createMonthModel();
			this.createYearViewModel();
			this.createCardTypeViewModel();
			this.onAddCard();

			oViewModel.setProperty("/busy", false);

		},

		onObjectMatchedReceivePayment: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			oViewModel.setProperty("/busy", true);
			this.getOrderDetails(this.getOwnerComponent().getModel("customerCockpitModel").getProperty("/receivePaymentOrder"),
				function (oData, response) {
					oViewModel.setProperty("/busy", false);
					this.getOwnerComponent().setModel(oData, "receivePaymentOrderDetailsModel");
					oViewModel.setProperty("/busy", true);
					this.getPaymentOrderDetails(this.getOwnerComponent().getModel("customerCockpitModel").getProperty("/receivePaymentOrder"),
						function (oData, response) {
							oViewModel.setProperty("/busy", false);
							this.getOwnerComponent().setModel(oData, "receivePaymentOrderModel");
							this.processReceivePaymentOrderDetails();
						}.bind(this),
						function (oError) {
							oViewModel.setProperty("/busy", false);
							console.log(oError);
						}.bind(this)
					);
				}.bind(this),
				function (oError) {
					oViewModel.setProperty("/busy", false);
					console.log(oError);
				}.bind(this)
			);
		},

		processReceivePaymentOrderDetails: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var oPaymentOrderModel = this.getOwnerComponent().getModel("receivePaymentOrderModel");
			var oOrderModel = this.getOwnerComponent().getModel("receivePaymentOrderDetailsModel");

			//Get the HeaderPartnerSet results which contain information such as email and countryCode. Sets to null if array empty.
			//**NOTE** Has to find the array element corresponding with SP, else it takes the first element in the array.
			var items = oOrderModel.HeaderPartnerSet.results;
			var customer = (items.length > 0) ? items.find(item => item.PartnerFunctionCode === "SP") : null;
			customer = (!customer && items.length > 0) ? items[0] : customer;

			var totalAmount = oOrderModel.TotalAmount;
			var email = (customer) ? customer.Email : "";
			var countryCode = (customer) ? customer.CountryCode : "";
			var vbeln = this.getOwnerComponent().getModel("customerCockpitModel").getProperty("/receivePaymentOrder");
			var orderTypeCode = oOrderModel.SalesOrderTypeCode;
			var requestedDeliveryDate = oOrderModel.RequestedDeliveryDate;
			var deliveryPlantCode = cartHeaderModel.getProperty("/deliveryPlant");
			var soldToPartyID = oOrderModel.SoldToPartyID;
			var incoTerms1 = oOrderModel.Inco1;
			var currency = oOrderModel.DocumentCurrency;

			this.createSetData();

			/*			console.log("oViewModel = ", oViewModel);
						console.log("orderHeaderModel = ", orderHeaderModel);
						console.log("cartHeaderModel = ", cartHeaderModel);
						console.log("oPaymentOrderModel = ", oPaymentOrderModel);
						console.log("oOrderModel = ", oOrderModel);*/

			oViewModel.setProperty("/totalAmount", totalAmount);
			oViewModel.setProperty("/payableAmount", totalAmount);
			oViewModel.setProperty("/paid", "0.00");
			oViewModel.setProperty("/countryCode", countryCode);
			oViewModel.setProperty("/vbeln", vbeln);

			cartHeaderModel.setProperty("/email", email);
			orderHeaderModel.setProperty("/totalAmount", totalAmount);
			orderHeaderModel.setProperty("/orderTypeCode", orderTypeCode);
			orderHeaderModel.setProperty("/requestedDeliveryDate", requestedDeliveryDate);
			orderHeaderModel.setProperty("/deliveryPlantCode", deliveryPlantCode);
			orderHeaderModel.setProperty("/soldToPartyID", soldToPartyID);
			orderHeaderModel.setProperty("/incoTerms1", incoTerms1);
			orderHeaderModel.setProperty("/currency", currency);

			this.createMonthModel();
			this.createYearViewModel();
			this.createCardTypeViewModel();
			this.onAddCard();
			this.updateAmountValues();
			this.updateCardAmountValue();
		},

		createSetData: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oPaymentOrderModel = this.getOwnerComponent().getModel("receivePaymentOrderModel");
			var cardSet = oPaymentOrderModel.PaymentEFTSet.results;
			var cashSet = oPaymentOrderModel.PaymentCashSet.results;

			var cashArr = [];

			if (cashSet.length > 0) {
				for (var j = 0; j < cashSet.length; j++) {
					var cashObj = {};
					cashObj.Cash = cashSet[j].Cash;
					cashObj.isCashEditable = false;
					cashArr.push(cashObj);
				}
			}

			cashArr.push({
				Cash: "",
				isCashEditable: true
			});

			var cardArr = [];

			for (var i = 0; i < cardSet.length; i++) {
				var cardObj = {};
				cardObj.cardNumber = cardSet[i].Cardnum;
				cardObj.cardAmount = cardSet[i].AmountWithoutCcfee;
				cardObj.cardType = cardSet[i].CreditCardType;
				cardObj.referenceNo = cardSet[i].Txnkey;
				cardObj.isEditable = false;
				cardArr.push(cardObj);
			}

			oViewModel.setProperty("/CashSet", cashArr);
			oViewModel.setProperty("/CardSet", cardArr);
		},

		createMonthModel: function () {
			var monthSet = [];
			for (var monthIndex = 1; monthIndex <= 12; monthIndex++) {
				var oMonth = {};
				var value;
				if (monthIndex <= 9) {
					value = "0" + monthIndex;
					oMonth.Key = value;
				} else {
					value = monthIndex;
					oMonth.Key = value;
				}
				oMonth.Value = value;

				monthSet.push(oMonth);
			}
			var monthViewModel = new JSONModel({});
			monthViewModel.setProperty("/MonthSet", monthSet);
			this.getView().setModel(monthViewModel, "monthViewModel");
		},

		createYearViewModel: function () {
			var date = new Date();
			var fullYear = date.getFullYear();
			fullYear = fullYear.toString();
			var year = fullYear.substring(2, fullYear.length);
			var yearSet = [];
			for (var yearIndex = 1; yearIndex <= 10; yearIndex++) {
				var oYear = {};
				oYear.Key = year;
				oYear.Value = year;
				yearSet.push(oYear);
				year++;
			}
			var yearViewModel = new JSONModel({});
			yearViewModel.setProperty("/YearSet", yearSet);
			this.getView().setModel(yearViewModel, "yearViewModel");

		},
		createCardTypeViewModel: function () {
			var cardTypesViewModel = new JSONModel({
				"CardTypes": [{
					"Key": "",
					"Value": ""
				}, {
					"Key": "MASTERCARD",
					"Value": "MASTERCARD"
				}, {
					"Key": "VISA",
					"Value": "VISA"
				}]

			});
			this.getView().setModel(cardTypesViewModel, "cardTypesViewModel");
		},

		loadImageModel: function () {
			var visaImage = sap.ui.require.toUrl("com/csr/order/images/visaIcon.png");
			var mastercardImage = sap.ui.require.toUrl("com/csr/order/images/mastercardIcon.png");
			var amexImage = sap.ui.require.toUrl("com/csr/order/images/amexIcon.png");

			var oImageModel = new sap.ui.model.json.JSONModel({
				visaIcon: visaImage,
				mastercardIcon: mastercardImage,
				amexIcon: amexImage
			});
			this.getView().setModel(oImageModel, "imageModel");
		},

		//------------- changes WRT bpoint payment From: C5265889----------------------
		onBPointPaymnet: function (oEvent) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oCardBindingContext = oEvent.getSource().getParent().getBindingContext("paymentViewModel");
			var cardPath = oCardBindingContext.sPath;
			var isCardDetailsValid = false;
			var cardDetails = oViewModel.getProperty(cardPath);
			var referenceNo = cardDetails.referenceNo;
			var bIsCCActive = this.getOwnerComponent().getModel("customerModel").getProperty("/IsCreditCardFeeActive");

			if (!referenceNo) {
				isCardDetailsValid = this.validateCardAmount(cardPath);
				var isPaymentValid = this.updateAmountValues();
				if (isCardDetailsValid && isPaymentValid) {
					oViewModel.setProperty("/busy", true);
					if (bIsCCActive) {
						this.initiateCreditCardSurcharge("BPoint", cardPath);
					} else {
						this.onBPointAuthKeyFetch(cardPath);
						oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", false);
						oViewModel.setProperty(cardPath + "/amountValueState", "None");
						this.getView().getModel("paymentViewModel").setProperty("/busy", false);
					}

				} else {
					oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", true);
					oViewModel.setProperty(cardPath + "/amountValueState", "Error");
				}
			}
		},

		initiateCreditCardSurcharge: function (paymentMethod, cardPath) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var sCardAmount = oViewModel.getProperty(cardPath + "/cardAmount").replace(/,/g, "");

			var oModel = new JSONModel({
				amount: sCardAmount,
				cardTypeSelected: false,
				IsCreditCardFeeActive: this.getOwnerComponent().getModel("customerModel").getProperty("/IsCreditCardFeeActive"),
				cardTypeEnabled: true,
				isAMEXAllowed: this.getOwnerComponent().getModel("customerModel").getProperty("/IsAMEXAllowed"),
				fee: 0,
				cardPercentage: 0,
				resetCard: false,
				paymentMethod: paymentMethod,
				cardPath: cardPath,
				isPinPad: (paymentMethod === "pinpad"),
				CCtypeShortDescription: "",
			});
			this.getView().setModel(oModel, "creditCardModel");

			//Check to see if in PCI mode to see if a dialog should appear or not
			if (this.getView().getModel("creditCardModel").getProperty("/paymentMethod") === "secureCo") {
				this._oDialog.setModel(oModel, "creditCardModel");
			} else {
				if (!this._oDialog) {
					this._oDialog = sap.ui.xmlfragment("com.csr.order.view.fragment.CCDialog", this);
					this._oDialog.addButton(new sap.m.Button({
						text: "Continue",
						press: this.onCreditCardFeeContinue.bind(this),
						enabled: "{= ${creditCardModel>/cardTypeSelected} }"
					}));
					this._oDialog.addButton(new sap.m.Button({
						text: "Cancel",
						press: this.onCloseCreditCardFee.bind(this)
					}));

					this.getView().addDependent(this._oDialog);
				}
				this._oDialog.setModel(this.getView().getModel("creditCardModel"), "creditCardModel");
				this._oDialog.open();
			}

			this.getCreditCardFees();
			this.loadImageModel();
		},

		onCreditCardFeeContinue: function (oEvent) {
			var IsPCIActive = this.getOwnerComponent().getModel("customerModel").getProperty("/IsPCIActive");
			var creditCardModel = this.getView().getModel("creditCardModel");
			var paymentMethod = creditCardModel.getProperty("/paymentMethod");
			var oViewModel = this.getView().getModel("paymentViewModel");
			var cardPath = creditCardModel.getProperty("/cardPath");

			//This logic determines what code is executed after the dialog is continued
			if (paymentMethod === "secureCo") {
				//Called in SecureCo

			} else if (paymentMethod === "BPoint") {
				//Called in BPoint

				this.onBPointAuthKeyFetch(cardPath);
				oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", false);
				oViewModel.setProperty(cardPath + "/amountValueState", "None");

				this._oDialog.close();
				this._oDialog.destroy();
				this._oDialog = undefined;
				this.getView().getModel("paymentViewModel").setProperty("/busy", false);

			} else if (paymentMethod === "pinpad") {
				//Called in Pinpad
				var cardDetails = oViewModel.getProperty(cardPath);

				if (cardPath !== null && cardDetails !== null) {
					this.triggerCardPayment(cardDetails, cardPath);
					oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", false);
					oViewModel.setProperty(cardPath + "/amountValueState", "None");
				}
				this._oDialog.close();
				this._oDialog.destroy();
				this._oDialog = undefined;
				this.getView().getModel("paymentViewModel").setProperty("/busy", false);
			}
		},

		onCloseCreditCardFee: function (oEvent) {
			if (this._oDialog) {
				this._oDialog.close();
				this._oDialog.destroy();
				this._oDialog = undefined;
				this.getView().getModel("paymentViewModel").setProperty("/busy", false);
			}
		},

		onBPointAuthKeyFetch: function (cardPath) {
			//BusyIndicator.show();
			var _that = this;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant"); //Werks
			var soldToPartyID = orderHeaderModel.getProperty("/soldToPartyID"); //Kunnr
			var salesOrg = oCustomerModel.getProperty("/salesOrg"); //Vkorg

			var creditCardModel = this.getView().getModel("creditCardModel");
			var sCardAmount = oViewModel.getProperty(cardPath + "/cardAmount").replace(/,/g, "");

			if (creditCardModel !== undefined && creditCardModel.getProperty("/IsCreditCardFeeActive")) {
				sCardAmount = creditCardModel.getProperty("/totalAmount");
			}

			var oModel = this.getOwnerComponent().getModel("authKey");
			oModel.callFunction(
				"/GetAuthKey", {
					method: "GET",
					urlParameters: {
						"Amount": sCardAmount,
						"Werks": deliveryPlant,
						"Vkorg": salesOrg,
						"Kunnr": soldToPartyID
					},
					success: function (oRetrievedData, oResponse) {
						//BusyIndicator.hide();
						var oRes = oRetrievedData.GetAuthKey;
						var sMessage = oRes.Message;
						oViewModel.setProperty("/authKey", oRes.AuthKey);
						oViewModel.setProperty("/authKeyGuid", oRes.GuId);
						if (sMessage === "SUCCESS") {
							_that.triggerPaymentHeader(oRes.AuthKey, oRes.GuId, sCardAmount, cardPath, true);

						} else {
							MessageBox.warning("Auth key fetch is " + sMessage);
						}

					}.bind(this),
					error: function (oError) {
						//BusyIndicator.hide();
						MessageBox.error("Fail to create auth key");
					}.bind(this)
				});
		},
		triggerPaymentHeader: function (sAuthKey, sGuId, sCardAmount, cardPath, flagX, isSecureCoGetVbeln, isSecureCoAfterSubmit) {
			var oThis = this;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oSecureCoModel = this.getView().getModel("secureCo");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var currency = orderHeaderModel.getProperty("/currency");
			var vbeln = (isSecureCoGetVbeln || isSecureCoAfterSubmit) && (!!oSecureCoModel.getProperty("/vbeln")) ? oSecureCoModel.getProperty(
				"/vbeln") : oViewModel.getProperty("/vbeln");

			var cardAmount = oViewModel.getProperty(cardPath + "/cardAmount");
			var cardNo = sGuId;
			var oCreditCardModel = this.getView().getModel("creditCardModel");

			cardAmount = cardAmount.replace(/,/g, "");

			var paymentRequest = {};
			paymentRequest = this.createPaymentHeaderRequest(isSecureCoGetVbeln, isSecureCoAfterSubmit);

			var paymentEFT = {};
			var paymentEFTSet = [];

			paymentEFT.Waerk = currency;
			paymentEFT.Amount = cardAmount;
			paymentEFT.Cardnum = cardNo;

			if (vbeln) {
				paymentEFT.Vbeln = vbeln;
			}
			if (flagX) {
				paymentEFT.Cardtype = "X";
			} else {
				paymentEFT.Cardtype = "2";
			}

			if (oCreditCardModel) {
				paymentEFT.CreditCardType = oCreditCardModel.getProperty("/creditCardType");
			}

			paymentEFTSet.push(paymentEFT);
			paymentRequest.PaymentEFTSet = paymentEFTSet;

			var oModel = this.getModel();
			oModel.setUseBatch(false);
			oModel.create("/PaymentHeaderSet", paymentRequest, {
				success: function (data) {
					if (isSecureCoGetVbeln) {
						oThis._openDialog(sCardAmount, cardPath, data);
					} else if (isSecureCoAfterSubmit) {
						oThis._handlePaymentForSecureCoAfterSubmit();
					} else {
						oThis.onBPointCardPaymentSuccessCallback(data, sAuthKey, sGuId, sCardAmount, cardPath, flagX);
					}
				},
				error: function (error) {
					oThis.onCardPaymentErrorCallback(error);
				}
			});
		},

		_handlePaymentForSecureCoAfterSubmit: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var payableAmount = oViewModel.getProperty("/payableAmount");

			this.onAddCard();
			this.updateAmountValues();
			this.updateCardAmountValue();

			if (payableAmount <= 0) {
				setTimeout(this.handlePayment(true), 100);
			} else {
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("paymentSuccess"), {
						duration: 6000
					});
				oViewModel.setProperty("/displayBackButton", false);
			}
		},

		onBPointCardPaymentSuccessCallback: function (data, sAuthKey, sGuId, sCardAmount, cardPath, flagX) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			oViewModel.setProperty("/vbeln", data.Vbeln);
			if (flagX) {
				this.bPointPaymentProcess(sAuthKey, sGuId, sCardAmount, cardPath);
			} else {
				this.updateBPointCardAmount(sCardAmount, cardPath);
			}
		},
		bPointPaymentProcess: function (sAuthKey, sGuId, sCardAmount, cardPath) {
			var _that = this;
			var sBpointURL;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oBPointURIData = this.getOwnerComponent().getModel("bpointModel").getData();
			var hostName = window.location.hostname;
			if (hostName.indexOf("cc7c2b28c") !== -1 || hostName.indexOf("c4956f941") !== -1) {
				sBpointURL = oBPointURIData.protocol + oBPointURIData.host + oBPointURIData.path + sAuthKey;
			} else {
				sBpointURL = oBPointURIData.protocol + oBPointURIData.liveHost + oBPointURIData.path + sAuthKey;
			}

			var htmlPage = new Html({
				preferDOM: true,
				content: "<iframe id='frameAdd' style='height:15rem;width:20rem' src='" + sBpointURL + "'></iframe>"

			});
			var oBPointDialog = new Dialog({
				type: DialogType.Message,
				title: "Bpoint payment",
				content: htmlPage,
				beginButton: new Button({
					type: ButtonType.Emphasized,
					text: "Submit",
					press: function () {
						_that._onBpointSubmit(sCardAmount, cardPath);
						oBPointDialog.destroy();
					}.bind(this)
				}),
				endButton: new Button({
					text: "Cancel",
					press: function () {
						oViewModel.setProperty("/busy", false);
						oBPointDialog.destroy();
					}.bind(this)
				})
			}).open();
		},
		_onBpointSubmit: function (sCardAmount, cardPath) {
			//BusyIndicator.show();
			var _that = this;
			var oModel = this.getOwnerComponent().getModel("authKey");
			var oViewModel = this.getView().getModel("paymentViewModel");
			var sAuthKey = oViewModel.getProperty("/authKey");
			var sGuId = oViewModel.getProperty("/authKeyGuid");
			var sVbeln = oViewModel.getProperty("/vbeln");
			var sSalesOrg = this.getOwnerComponent().getModel("customerModel").getProperty("/salesOrg");
			var sPlant = this.getOwnerComponent().getModel("orderHeaderModel").getProperty("/deliveryPlantCode");
			var creditCardModel = this.getView().getModel("creditCardModel");
			var bIsCCFeeActive = this.getView().getModel("customerModel").getProperty("/IsCreditCardFeeActive");
			var sCardAmount = oViewModel.getProperty(cardPath + "/cardAmount").replace(/,/g, "");
			var sCardValue = sCardAmount;

			if (bIsCCFeeActive) {
				if (creditCardModel.getProperty("/IsCreditCardFeeActive")) {
					sCardAmount = creditCardModel.getProperty("/totalAmount");
				}
			}
			oModel.callFunction(
				"/ActionSubmit", {
					method: "POST",
					urlParameters: {
						"GuId": sGuId,
						"AuthKey": sAuthKey,
						"Amount": sCardAmount,
						"Vbeln": sVbeln,
						"SalesOrg": sSalesOrg,
						"Plant": sPlant
					},
					success: function (oRetrievedData, oResponse) {
						//BusyIndicator.hide();
						var oRes = oRetrievedData.ActionSubmit;
						var sTransStatus = oRes.Response;
						if (sTransStatus === "Approved") {
							oRes.Amount = parseFloat(parseInt(oRes.Amount, 10) / 100, 10).toFixed(2);
							MessageToast.show(
								_that.getResourceBundle().getText("paymentSuccess"), {
									duration: 6000
								});

							_that.triggerPaymentHeader(sAuthKey, sGuId, sCardValue, cardPath, false);
							//setTimeout(_that.updateBPointCardAmount(oRes, cardPath), 100);
							oViewModel.setProperty("/bPointTxnNo", oRes.TransNo);
						} else {
							oViewModel.setProperty("/busy", false);
							if (oRes.Response === "") {
								MessageBox.error("Please try again");
							} else {
								MessageBox.error("Bpoint transaction is" + oRes.Response + "\n" + oRes.ResMsg);
							}

						}

					}.bind(this),
					error: function (oError) {
						//	BusyIndicator.hide();
						this._showServiceError(oError);
					}.bind(this)
				});
		},
		updateBPointCardAmount: function (sCardAmount, cardPath) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var cardEntry = {};
			cardEntry.cardAmount = sCardAmount;
			oViewModel.setProperty(cardPath, cardEntry);
			cardEntry.referenceNo = oViewModel.getProperty("/bPointTxnNo");
			cardEntry.isEditable = false;
			oViewModel.setProperty(cardPath, cardEntry);
			this.onAddCard();
			this.updateAmountValues();
			this.updateCardAmountValue();
			var payableAmount = oViewModel.getProperty("/payableAmount");
			if (payableAmount <= 0) {
				setTimeout(this.handlePayment(), 100);
			} else {
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("paymentSuccess"), {
						duration: 6000
					});
				oViewModel.setProperty("/displayBackButton", false);
			}
		},
		//-----------------------------------------------------------------------------
		onCardPayment: function (oEvent) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oCardBindingContext = oEvent.getSource().getParent().getBindingContext("paymentViewModel");
			var cardPath = oCardBindingContext.sPath;
			var isCardDetailsValid = false;
			var cardDetails = oViewModel.getProperty(cardPath);
			var referenceNo = cardDetails.referenceNo;
			var bIsCCActive = this.getOwnerComponent().getModel("customerModel").getProperty("/IsCreditCardFeeActive");

			if (!referenceNo) {
				isCardDetailsValid = this.validateCardAmount(cardPath);
				var isPaymentValid = this.updateAmountValues();
				if (isCardDetailsValid && isPaymentValid) {
					oViewModel.setProperty("/busy", true);

					if (bIsCCActive) {
						this.initiateCreditCardSurcharge("pinpad", cardPath);
					} else {
						this.triggerCardPayment(cardDetails, cardPath);
						oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", false);
						oViewModel.setProperty(cardPath + "/amountValueState", "None");
						this.getView().getModel("paymentViewModel").setProperty("/busy", false);
					}

				} else {
					oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", true);
					oViewModel.setProperty(cardPath + "/amountValueState", "Error");
				}
			}
		},
		onAddCard: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var countryModel = this.getOwnerComponent().getModel("countryModel");
			var sCountryCode = countryModel.getProperty("/countryCode");
			oViewModel.setProperty("/busy", true);
			var cardItems = oViewModel.getProperty("/CardSet");
			var cardsCount = cardItems.length;
			var card = {};
			card.cardAmount = oViewModel.getProperty("/payableAmount");
			card.countryCode = sCountryCode;
			card.isEditable = true;
			oViewModel.setProperty("/CardSet/" + cardsCount, card);
			oViewModel.setProperty("/busy", false);
		},
		onCashAmountChange: function (oEvent) {
			this.updateAmountValues(true);
			this.updateCardAmountValue();
		},
		updateAmountValues: function (isCash) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var totalAmount = oViewModel.getProperty("/totalAmount");
			var cashSet = oViewModel.getProperty("/CashSet");
			var cashCount = cashSet.length;
			var cardSet = oViewModel.getProperty("/CardSet");
			var cardCount = cardSet.length;
			var cashAmount = 0;
			var cardAmount = 0;
			var paidValue = 0;
			var payableAmount = 0;
			var changeAmount = 0;
			for (var cashIndex = 0; cashIndex < cashCount; cashIndex++) {
				var cash = cashSet[cashIndex];
				if (cash.Cash) {
					cash.Cash = cash.Cash.replace(/,/g, "");
					cashAmount += parseFloat(cash.Cash);
				}
			}
			for (var cardIndex = 0; cardIndex < cardCount; cardIndex++) {
				var card = cardSet[cardIndex];
				if (card.cardAmount && !card.isEditable) {
					card.cardAmount = card.cardAmount.replace(/,/g, "");
					cardAmount += parseFloat(card.cardAmount);
				}
			}
			paidValue = parseFloat(cashAmount) + parseFloat(cardAmount);
			payableAmount = parseFloat(totalAmount) - parseFloat(paidValue);

			if (payableAmount < 0 && !isCash) {
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("paidValueValidation"), {
						duration: 6000
					});
				return false;
			} else {

				if (payableAmount < 0) {
					changeAmount = (payableAmount) * -1;
					payableAmount = 0;
				}
				paidValue = parseFloat(paidValue).toFixed(2);
				payableAmount = parseFloat(payableAmount).toFixed(2);
				changeAmount = parseFloat(changeAmount).toFixed(2);
				oViewModel.setProperty("/paid", paidValue);
				oViewModel.setProperty("/payableAmount", payableAmount);
				oViewModel.setProperty("/changeAmount", changeAmount);
				return true;
			}
		},
		updateCardAmountValue: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var cardItems = oViewModel.getProperty("/CardSet");
			var cardsCount = cardItems.length;
			var card;
			var cardPath;
			if (cardsCount >= 0) {
				cardPath = cardsCount - 1;
				card = oViewModel.getProperty("/CardSet/" + cardPath);
				card.cardAmount = oViewModel.getProperty("/payableAmount");
			}
			oViewModel.refresh();
		},
		onCardAmountChange: function (oEvent) {
			var oCardBindingContext = oEvent.getSource().getParent().getBindingContext("paymentViewModel");
			var cardPath = oCardBindingContext.sPath;
			this.validateCardAmount(cardPath);
		},
		validateCardAmount: function (cardPath) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var payableAmount = oViewModel.getProperty("/payableAmount");
			var cardDetails = oViewModel.getProperty(cardPath);
			var cardAmountValue = parseFloat(cardDetails.cardAmount);
			var payableAmountValue = parseFloat(payableAmount);
			if (cardAmountValue && cardAmountValue <= payableAmountValue) {
				oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", false);
				oViewModel.setProperty(cardPath + "/amountValueState", "None");
				return true;
			} else {
				oViewModel.setProperty(cardPath + "/showAmountValueStateMessage", true);
				oViewModel.setProperty(cardPath + "/amountValueState", "Error");
				return false;
			}
		},

		validateComboBox: function (oEvent) {
			var path = oEvent.getSource().getBindingPath("selectedKey");
			var showValueStatePath = oEvent.getSource().getBindingPath("showValueStateMessage");
			var valueStatePath = oEvent.getSource().getBindingPath("valueState");
			var oViewModel = this.getView().getModel("paymentViewModel");
			if (oViewModel.getProperty(path)) {
				oViewModel.setProperty(showValueStatePath, false);
				oViewModel.setProperty(valueStatePath, "None");
				return true;
			} else {
				oViewModel.setProperty(showValueStatePath, true);
				oViewModel.setProperty(valueStatePath, "Error");
				return false;
			}
		},

		triggerCardPayment: function (cardDetails, cardPath) {
			var oThis = this;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oSecureCoModel = this.getView().getModel("secureCo");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var currency = orderHeaderModel.getProperty("/currency");
			var vbeln = oSecureCoModel ? !!oSecureCoModel.getProperty("/vbeln") ? oSecureCoModel.getProperty("/vbeln") : oViewModel.getProperty(
				"/vbeln") : oViewModel.getProperty("/vbeln");

			var cardAmount = oViewModel.getProperty(cardPath + "/cardAmount");
			var cardPartOne = oViewModel.getProperty(cardPath + "/cardPartOne");
			var cardPartTwo = oViewModel.getProperty(cardPath + "/cardPartTwo");
			var cardPartThree = oViewModel.getProperty(cardPath + "/cardPartThree");
			var cardPartFour = oViewModel.getProperty(cardPath + "/cardPartFour");
			var cardType = oViewModel.getProperty(cardPath + "/cardType");
			var expiryMonth = oViewModel.getProperty(cardPath + "/month");
			var expiryYear = oViewModel.getProperty(cardPath + "/year");
			var cardNo;

			var creditCardModel = this.getView().getModel("creditCardModel");

			cardAmount = cardAmount.replace(/,/g, "");

			if (cardPartOne && cardPartTwo && cardPartThree && cardPartFour) {
				cardNo = cardPartOne + cardPartTwo + cardPartThree + cardPartFour;
			}

			var paymentRequest = {};
			paymentRequest = this.createPaymentHeaderRequest();

			var paymentEFT = {};
			var paymentEFTSet = [];

			paymentEFT.Waerk = currency;
			paymentEFT.Amount = cardAmount;
			if (expiryMonth && expiryYear && cardNo) {
				paymentEFT.Expiry = expiryMonth + expiryYear;
				paymentEFT.Cardnum = cardNo;
			}

			if (vbeln) {
				paymentEFT.Vbeln = vbeln;
			}
			if (cardType) {
				paymentEFT.Cardtype = cardType;
			}

			if (creditCardModel !== undefined) {
				paymentEFT.CreditCardType = creditCardModel.getProperty("/creditCardType");
			}

			paymentEFTSet.push(paymentEFT);
			paymentRequest.PaymentEFTSet = paymentEFTSet;

			var oModel = this.getModel();
			oModel.setUseBatch(false);
			oModel.create("/PaymentHeaderSet", paymentRequest, {
				success: function (data) {
					oThis.onCardPaymentSuccessCallback(data, cardPath);

				},
				error: function (error) {
					oThis.onCardPaymentErrorCallback(error);
				}
			});
		},
		onCardPaymentSuccessCallback: function (data, cardPath) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var payableAmount;
			oViewModel.setProperty("/vbeln", data.Vbeln);
			if (data.IsFailed) {
				sap.m.MessageToast.show(
					data.Message, {
						duration: 6000
					});
				oViewModel.setProperty("/busy", false);
			} else {
				this.updateCardList(data, cardPath);
				this.onAddCard();
				this.updateAmountValues();
				this.updateCardAmountValue();

				payableAmount = oViewModel.getProperty("/payableAmount");
				if (payableAmount <= 0) {
					this.handlePayment();
				} else {
					oViewModel.setProperty("/busy", false);
					sap.m.MessageToast.show(
						this.getResourceBundle().getText("paymentSuccess"), {
							duration: 6000
						});
					oViewModel.setProperty("/displayBackButton", false);
				}
			}
		},
		onCardPaymentErrorCallback: function (error) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			oViewModel.setProperty("/busy", false);
			var errorResponse = JSON.parse(error.responseText);
			var errorMessage = errorResponse.error.message.value;
			sap.m.MessageToast.show(
				errorMessage, {
					duration: 6000
				});
		},
		updateCardList: function (data, cardPath) {
			var oViewModel = this.getView().getModel("paymentViewModel");

			if (data.PaymentEFTSet) {
				var cardSet = data.PaymentEFTSet.results;
				if (cardSet && cardSet.length > 0) {
					var card = cardSet[0];
					var cardEntry = {};
					var cardNo = card.Cardnum;
					if (cardNo) {
						cardEntry.cardPartOne = cardNo.substring(0, 4);
						cardEntry.cardPartTwo = cardNo.substring(4, 8);
						cardEntry.cardPartThree = cardNo.substring(8, 12);
						cardEntry.cardPartFour = cardNo.substring(12, 16);
					}
					cardEntry.cardType = card.Cardtype;
					cardEntry.cardAmount = card.Amount;
					var cardExpiry = card.Expiry;
					if (cardExpiry) {
						cardEntry.month = cardExpiry.substring(0, 2);
						cardEntry.year = cardExpiry.substring(2, 4);
					}
					cardEntry.referenceNo = card.Txnkey;
					cardEntry.isEditable = false;
					oViewModel.setProperty(cardPath, cardEntry);
				}
			}
		},

		getAssestID: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var assestID = sap.ui.getCore().byId("currentAsset");
			var assestIDValue = "";
			var oAssetModel = sap.ui.getCore().getModel("AssetModel");
			if (assestID) {
				assestIDValue = assestID.getValue();
			} else if (oAssetModel) {
				assestIDValue = oAssetModel.getProperty("/DefaultAsset");
			}
			oViewModel.setProperty("/assestID", assestIDValue);
		},
		createPaymentHeaderRequest: function (isSecureCoGetVbeln, isSecureCoAfterSubmit) {

			this.getAssestID();
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oCustomerModel = this.getOwnerComponent().getModel("customerModel");
			var cartHeaderModel = this.getOwnerComponent().getModel("cartHeaderModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var secureCoViewModel = this.getView().getModel("secureCo");
			var salesOrg = oCustomerModel.getProperty("/salesOrg");
			var distrubutionChannel = oCustomerModel.getProperty("/distChannel");
			var division = oCustomerModel.getProperty("/division");
			var deliveryPlant = cartHeaderModel.getProperty("/deliveryPlant");
			var currency = orderHeaderModel.getProperty("/currency");
			var incoTerms1 = orderHeaderModel.getProperty("/incoTerms1");
			var salesOrderType = orderHeaderModel.getProperty("/orderTypeCode");
			var assestID = this._getAssetSelectedOrDefault();
			var totalAmount = oViewModel.getProperty("/totalAmount");
			var vbeln = secureCoViewModel ? !!secureCoViewModel.getProperty("/vbeln") ? secureCoViewModel.getProperty("/vbeln") : oViewModel.getProperty(
				"/vbeln") : oViewModel.getProperty("/vbeln");
			var soldToPartyID = orderHeaderModel.getProperty("/soldToPartyID");

			var paymentRequest = {};
			paymentRequest.Sydatum = null;
			paymentRequest.Vkorg = salesOrg;
			paymentRequest.Inco1 = incoTerms1;
			paymentRequest.Werks = deliveryPlant;
			paymentRequest.Waerk = currency;
			paymentRequest.Spart = division;
			paymentRequest.Kunnr = soldToPartyID;
			paymentRequest.Vtweg = distrubutionChannel;
			paymentRequest.Posamt = totalAmount;
			if (vbeln) {
				paymentRequest.Vbeln = vbeln;
			}
			// Ensure we have a valid asset ID before sending to backend
			if (!assestID || assestID === "") {
				// Final attempt to get asset ID if not already set
				this.getAssestID(); // This will set it in paymentViewModel
				assestID = oViewModel.getProperty("/assestID");
			}
			
			if (assestID && assestID !== "") {
				paymentRequest.Assetid = assestID;
			}
			paymentRequest.Auart = salesOrderType;

			return paymentRequest;
		},
		handlePayment: function (isSecureCo) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var isCashAvailable = this.isCashAvailable();
			var isEligibleForOrderCreate = this.isEligibleForOrderCreate();
			isSecureCo = this.determineIsSecureCoFlagForHandlePayment(isSecureCo);
			if (isEligibleForOrderCreate) {
				oViewModel.setProperty("/busy", true);
				if (isCashAvailable) {
					setTimeout(this.triggerPayment(isSecureCo), 100);
				} else {
					this.triggerCreateOrderService(isSecureCo);
				}
			} else {
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("fullPaymentMsg"), {
						duration: 6000
					});
			}
		},
		determineIsSecureCoFlagForHandlePayment: function (isSecureCo) {
			var secureCoVbeln = this.getView().getModel("secureCo").getProperty("/vbeln") ? this.getView().getModel("secureCo").getProperty(
				"/vbeln") : "";
			isSecureCo = typeof isSecureCo === "object" ? false : isSecureCo;
			isSecureCo = !isSecureCo ? secureCoVbeln !== "" ? true : isSecureCo : isSecureCo;
			return isSecureCo;
		},
		isEligibleForOrderCreate: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var payableAmount = oViewModel.getProperty("/payableAmount");
			var salesOrderType = orderHeaderModel.getProperty("/orderTypeCode");
			if (salesOrderType === "YIO" && payableAmount <= 0) {
				return true;
			} else if (salesOrderType !== "YIO") {
				return true;
			} else {
				return false;
			}
		},
		isCashAvailable: function () {
			var oViewModel = this.getView().getModel("paymentViewModel");
			var cashSet = this.getCashSet();
			var cashCount = cashSet.length;
			for (var cashIndex = 0; cashIndex < cashCount; cashIndex++) {
				var cash = cashSet[cashIndex];
				var cashAmount = cash.Cash;
				if (cashAmount) {
					return true;
				}
			}
			return false;
		},
		triggerPayment: function (isSecureCo) {
			var oThis = this;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oSecureCoModel = this.getView().getModel("secureCo");
			var paymentRequest = this.createPaymentHeaderRequest(false, isSecureCo);
			var cashSet = this.getCashSet();
			var cashCount = cashSet.length;
			var paymentCashSet = [];
			var paymentEFTSet = [];
			var paymentCash;
			var cash;
			var cashAmount;
			var vbeln = isSecureCo ? oSecureCoModel.getProperty("/vbeln") : oViewModel.getProperty("/vbeln");

			paymentRequest.PaymentEFTSet = paymentEFTSet;

			for (var cashIndex = 0; cashIndex < cashCount; cashIndex++) {
				cash = cashSet[cashIndex];
				cashAmount = cash.Cash;
				cashAmount = cashAmount.replace(/,/g, "");
				if (cashAmount) {
					paymentCash = {};
					paymentCash.Cash = cashAmount;
					paymentCash.Vbeln = vbeln;
				}
				paymentCashSet.push(paymentCash);
			}
			paymentRequest.PaymentCashSet = paymentCashSet;

			var oModel = this.getModel();
			oModel.setUseBatch(false);
			oModel.create("/PaymentHeaderSet", paymentRequest, {
				success: function (data) {
					oThis.onPaymentSuccessCallback(data);
				},
				error: function (error) {
					oThis.onPaymentErrorCallback(error);
				}
			});
		},
		getCashSet: function () {
			var oViewModel = this.getView().getModel("paymentViewModel"),
				cashSet = [];
			if (oViewModel.getProperty("/CashSet").length > 1) {
				cashSet = oViewModel.getProperty("/CashSet").filter((CashSetItem) => CashSetItem.isCashEditable === true);
			} else {
				cashSet = oViewModel.getProperty("/CashSet");
			}
			return cashSet;
		},
		onPaymentSuccessCallback: function (data) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			oViewModel.setProperty("/vbeln", data.Vbeln);
			if (data.IsFailed) {
				sap.m.MessageToast.show(
					data.Message, {
						duration: 6000
					});
				oViewModel.setProperty("/busy", false);
			} else {
				sap.m.MessageToast.show(this.getResourceBundle().getText("paymentSuccess"));

				setTimeout(this.triggerCreateOrderService(), 100);
			}
		},
		onPaymentErrorCallback: function (error) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			oViewModel.setProperty("/busy", false);
			var errorResponse = JSON.parse(error.responseText);
			var errorMessage = errorResponse.error.message.value;
			sap.m.MessageToast.show(
				errorMessage, {
					duration: 6000
				});
		},

		triggerCreateOrderService: function (isSecureCo) {
			var oThis = this;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var createOrderRequest = OrderServiceUtil.getHeaderForCreateOrder.apply(this);
			var salesOrderTypeCode = orderHeaderModel.getProperty("/orderTypeCode");
			var salesOrderID = oViewModel.getProperty("/vbeln");

			var deliveryBlockCode = oViewModel.getProperty("/deliveryBlockType");
			var bilingBlockCode = oViewModel.getProperty("/billingBlockType");
			var payableAmount = oViewModel.getProperty("/payableAmount");
			payableAmount = parseFloat(payableAmount, [10]);

			createOrderRequest.SalesOrderID = salesOrderID;
			createOrderRequest.DeliveryBlockCode = deliveryBlockCode;
			createOrderRequest.BillingBlockCode = bilingBlockCode;

			if (payableAmount <= 0) {
				createOrderRequest.Zzpaidfull = "X";
			}

			var noteSet = OrderServiceUtil.getHeaderTextForCreateOrder.apply(this);
			createOrderRequest.HeaderTextSet = noteSet;
			var vbelnRef = orderHeaderModel.getProperty("/VbelnRef");
			if (vbelnRef) {
				createOrderRequest.VbelnRef = vbelnRef;
			}

			createOrderRequest.IsSecureCo = isSecureCo;
			createOrderRequest.SecureCoVbeln = this.getView().getModel("secureCo").getProperty("/vbeln");

			if (this.getOwnerComponent().getModel("customerCockpitModel").getProperty("/receivePaymentOrder") !== "") {
				createOrderRequest.Updkz = "U";
			}

			var HeaderPartnerSet = [];
			var partner = OrderServiceUtil.getHeaderPartnerForRequest.apply(this);
			HeaderPartnerSet.push(partner);
			createOrderRequest.HeaderPartnerSet = HeaderPartnerSet;

			if (salesOrderTypeCode !== "YIO" && salesOrderTypeCode !== "YQT") {
				var requestedDeliveryDate = orderHeaderModel.getProperty("/requestedDeliveryDate");
				createOrderRequest.RequestedDeliveryDate = this.formatter.formatDate(requestedDeliveryDate);

			} else if (salesOrderTypeCode === "YQT") {
				var validTo = orderHeaderModel.getProperty("/quoteEndDate");

				if (validTo) {
					createOrderRequest.Bnddt = this.formatter.formatDate(validTo);
				}
				createOrderRequest.Angdt = this.formatter.formatDate(new Date());
			}

			var itemSet = OrderServiceUtil.getItemSetForRequest.apply(this);
			createOrderRequest.ItemSet = itemSet;

			var oModel = this.getModel();
			oModel.setUseBatch(false);
			oModel.create("/HeaderSet", createOrderRequest, {
				success: function (data) {
					oThis.onOrderCreateSuccessCallback(data);
				},
				error: function (error) {
					oThis.onOrderCreateErrorCallback(error);
				}
			});
		},
		onOrderCreateSuccessCallback: function (data) {
			var salesOrderID = data.SalesOrderID;
			var salesOrderTypeCode = data.SalesOrderTypeCode;
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var oViewModel = this.getView().getModel("paymentViewModel");
			var itemSet = [];
			var requestedDeliveryDateValue = new Date();
			var cartItem = {};
			var orderMsg;
			var errorMsg = data.ErrorMessage;

			if (requestedDeliveryDateValue) {
				cartItem.deliveryDate = requestedDeliveryDateValue;
			} else {
				cartItem.deliveryDate = new Date();
			}
			itemSet.push(cartItem);
			cartItemsModel.setProperty("/ItemSet", itemSet);
			cartItemsModel.setProperty("/totalItemCount", 0);
			cartItemsModel.setProperty("/addButtonEnabled", false);
			cartItemsModel.setProperty("/checkoutButtonEnabled", false);

			// Clear Order Header Values
			OrderServiceUtil.clearValuesInModel.apply(this);
			this.oEventBus.publish("Payment", "refreshProductList", {});
			this.oEventBus.publish("Payment", "refreshShipToValues", {});

			this.getView().getModel("secureCo").setProperty("/vbeln", "");

			if (salesOrderTypeCode === "YQT") {
				orderMsg = this.getResourceBundle().getText("quoteCreated", [salesOrderID, errorMsg]);
			} else if (salesOrderTypeCode === "YIO") {
				orderMsg = this.getResourceBundle().getText("immediateOrderCreated", [salesOrderID, errorMsg]);
			} else if (salesOrderTypeCode === "YOR") {
				orderMsg = this.getResourceBundle().getText("standardOrderCreated", [salesOrderID, errorMsg]);
			} else if (salesOrderTypeCode === "YOR1") {
				orderMsg = this.getResourceBundle().getText("thirdPartyOrderCreated", [salesOrderID, errorMsg]);
			} else {
				orderMsg = this.getResourceBundle().getText("salesOrderCreated", [salesOrderID, errorMsg]);
			}

			var isPrintReceiptSelected = oViewModel.getProperty("/PrintReceipt");
			var isEmailSelected = oViewModel.getProperty("/EmailReceipt");

			if (isPrintReceiptSelected || isEmailSelected) {
				jQuery.sap.delayedCall(3000, this, function () {
					this.triggerReceipt(salesOrderID, orderMsg);
				});
			} else {
				oViewModel.setProperty("/busy", false);

				if (this.getOwnerComponent().getModel("customerCockpitModel").getProperty("/receivePaymentOrder") !== "") {
					sap.m.MessageToast.show(
						orderMsg, {
							duration: 6000
						});
					this.navToCustomerCockpit();

				} else {
					this.navToHomeScreen(orderMsg);
				}
			}
		},
		onOrderCreateErrorCallback: function (error) {
			var oViewModel = this.getView().getModel("paymentViewModel");
			oViewModel.setProperty("/busy", false);
			var errorResponse = JSON.parse(error.responseText);
			var errorMessage = errorResponse.error.message.value;
			sap.m.MessageToast.show(
				errorMessage, {
					duration: 6000
				});
		},
		triggerReceipt: function (documentNo, orderMsg) {
			var oThis = this;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var isPrintReceiptSelected = oViewModel.getProperty("/PrintReceipt");
			var isEmailSelected = oViewModel.getProperty("/EmailReceipt");
			var nacha = "1";
			var email = "";
			if (isPrintReceiptSelected) {
				nacha = "1";
			}
			if (isEmailSelected) {
				nacha = "7";
				var customerEmail = oViewModel.getProperty("/email");
				if (customerEmail) {
					email = customerEmail;
				}
			}
			if (isPrintReceiptSelected & isEmailSelected) {
				nacha = "1";
			}

			var oModel = this.getModel();
			oModel.setUseBatch(false);
			oModel.callFunction(
				"/PrintL", {
					method: "POST",
					urlParameters: {
						"Objky": documentNo,
						"Nacha": nacha,
						"PrintInd": "PR",
						"Email": email
					},
					success: function (data) {
						oViewModel.setProperty("/busy", false);
						oThis._navigateAfterReceipt(orderMsg);
					},
					error: function (error) {
						oViewModel.setProperty("/busy", false);
						try {
							var errorResponse = JSON.parse(error.responseText);
							var errorMessage = errorResponse.error.message.value;
							sap.m.MessageToast.show(
								errorMessage, {
									duration: 6000
								});
						} catch (e) {
							// response may not be valid JSON
						}
						oThis._navigateAfterReceipt(orderMsg);
					}
				}
			);
		},
		_navigateAfterReceipt: function (orderMsg) {
			if (this.getOwnerComponent().getModel("customerCockpitModel").getProperty("/receivePaymentOrder") !== "") {
				sap.m.MessageToast.show(
					orderMsg, {
						duration: 6000
					});
				this.navToCustomerCockpit();

			} else {
				this.navToHomeScreen(orderMsg);
			}
		},
		navToHomeScreen: function (orderMsg) {
			var oInitialViewModel = this.createViewModel();
			this.getView().setModel(oInitialViewModel, "paymentViewModel");
			sap.m.MessageToast.show(
				orderMsg, {
					duration: 6000
				});
			var oModel = this.getModel();
			oModel.setUseBatch(true);
			this.getOwnerComponent().getRouter().navTo("Home", null, true);
		},

		onNavBack: function () {
			this.handleCancel();
		},

		//Updated to handle receive payment navigation
		handleCancel: function () {
			var oCustomerCockpitModel = this.getOwnerComponent().getModel("customerCockpitModel");
			var oInitialViewModel = this.createViewModel();

			// If customerCockpitModel exists and has a receive payment order number, then nav using previous hash
			// Otherwise, nav back to the OrderShipment page
			if (oCustomerCockpitModel && oCustomerCockpitModel.getProperty("/receivePaymentOrder")) {
				var sPreviousHash = History.getInstance().getPreviousHash();
				if (sPreviousHash !== undefined) {
					history.go(-1);
				} else {
					this.navToCustomerCockpit();
				}
			} else {
				this.getView().setModel(oInitialViewModel, "paymentViewModel");
				this.getOwnerComponent().getRouter().navTo("OrderShipment", null, true);
			}
		},

		navToCustomerCockpit: function () {
			var crossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			crossAppNavigator.toExternal({
				target: {
					semanticObject: "customercockpit",
					action: "Display"
				}
			});
		},

		// Payment Card Industry (PCI) Compliance related changes start
		onRemoveCard: function () {
			var oTable = this.getView().byId("cardTable");
			var aSelectedItems = oTable.getSelectedItems();
			var oViewModel = this.getView().getModel("paymentViewModel");

			if (aSelectedItems.length > 0) {
				oViewModel.setProperty("/busy", true);
				var cardItems = oViewModel.getProperty("/CardSet");
				var newCardItems = [];

				cardItems.forEach(function (oItem) {
					var bIsSelected = false;
					aSelectedItems.forEach(function (oSelectedItem) {
						if (oItem === oSelectedItem.getBindingContext("paymentViewModel").getObject()) {
							bIsSelected = true;
						}
					});

					if (!bIsSelected) {
						newCardItems.push(oItem);
					}
				});

				oViewModel.setProperty("/CardSet", newCardItems);
				oViewModel.setProperty("/busy", false);
			}
		},
		fnFunctionImport: function (oModel, sMethod, sEntitySet, mParameters) {
			return new Promise(function (resolve, reject) {
				oModel.callFunction(sEntitySet, {
					method: sMethod,
					urlParameters: mParameters,
					success: function (oData) {
						resolve(oData);
					}.bind(this),
					error: function (error) {
						reject(error);
					}.bind(this)
				});
			}.bind(this));
		},

		fnCreateEntity: function (oModel, sPath, oPost) {
			var oKey = {};
			oModel.setUseBatch(false);
			return new Promise(function (resolve, reject) {
				oModel.create(sPath, oPost, {
					success: function (oData, oResponse) {
						resolve(oData);
					}.bind(this),
					error: function (error) {
						reject(error);
					}.bind(this)
				});
			}.bind(this));
		},

		onSecureCoPayment: function (oEvent) {
			// this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			// Open the dialog

			var cardAmount = oEvent.getSource().getBindingContext("paymentViewModel").getObject().cardAmount;
			var oViewModel = this.getView().getModel("paymentViewModel");
			var oCardBindingContext = oEvent.getSource().getParent().getBindingContext("paymentViewModel");
			var cardPath = oCardBindingContext.sPath;
			var payableAmount = this.getView().getModel("paymentViewModel").getProperty("/payableAmount"),
				cardAmountParsed = parseFloat(cardAmount);
			if (!cardAmountParsed || cardAmountParsed > payableAmount) {
				var invalidAmountErrorText = !cardAmountParsed ? this.getResourceBundle().getText("emptyOrZeroAmount") :
					this.getResourceBundle().getText("cardAmountError", [payableAmount]);
				MessageBox.error(invalidAmountErrorText, {
					title: this.getResourceBundle().getText("invalidAmount"),
				});
			} else {
				// Enhanced asset validation with multiple fallback strategies
				var assetId = this._getAssetSelectedOrDefault();
				var shouldBypass = this._shouldBypassAssetCheck();
				
				if (assetId !== "" || shouldBypass) {
					// Asset found or validation should be bypassed
					if (assetId === "" && shouldBypass) {
						// Ensure we have an asset ID for the payment
						this.getAssestID(); // This sets the assestID in paymentViewModel
					}
					this.triggerPaymentHeader("", "", cardAmount, cardPath, true, true);
				} else {
					// Final attempt: force asset lookup and check again
					this.getAssestID(); // This sets the assestID in paymentViewModel
					var viewModelAssetId = this.getView().getModel("paymentViewModel").getProperty("/assestID");
					if (viewModelAssetId && viewModelAssetId !== "") {
						this.triggerPaymentHeader("", "", cardAmount, cardPath, true, true);
					} else {
						MessageToast.show(
							this.getResourceBundle().getText("noAssetAssigned"), {
								duration: 1000
							});
					}
				}
			}
		},

		_getAssetSelected: function () {
			var oAssetSelected = sap.ui.getCore().byId("AssetIDSelect");
			if (oAssetSelected) {
				var assetSelected = sap.ui.getCore().byId("AssetIDSelect").getSelectedKey();
			}
			if (assetSelected && assetSelected !== "") {
				return assetSelected;
			} else {
				return "";
			}
		},

		_getAssetSelectedOrDefault: function () {
			// First try to get asset from dialog selection
			var assetSelected = this._getAssetSelected();
			if (assetSelected && assetSelected !== "") {
				return assetSelected;
			}
			
			// Try multiple fallback approaches for asset detection
			var assetValue = "";
			
			try {
				// Method 1: Check currentAsset control (from FLP extension)
				var currentAsset = sap.ui.getCore().byId("currentAsset");
				if (currentAsset && currentAsset.getValue) {
					assetValue = currentAsset.getValue();
					if (assetValue && assetValue !== "") {
						return assetValue;
					}
				}
			} catch (e) {
				// Ignore errors from external controls
			}
			
			try {
				// Method 2: Check AssetModel (from FLP extension)
				var oAssetModel = sap.ui.getCore().getModel("AssetModel");
				if (oAssetModel && oAssetModel.getProperty) {
					assetValue = oAssetModel.getProperty("/DefaultAsset");
					if (assetValue && assetValue !== "") {
						return assetValue;
					}
				}
			} catch (e) {
				// Ignore errors from external models
			}
			
			try {
				// Method 3: Check if asset is already set in paymentViewModel
				var oViewModel = this.getView().getModel("paymentViewModel");
				if (oViewModel) {
					assetValue = oViewModel.getProperty("/assestID");
					if (assetValue && assetValue !== "") {
						return assetValue;
					}
				}
			} catch (e) {
				// Ignore errors
			}
			
			try {
				// Method 4: Check for emergency fallback asset (set by FLP extension)
				if (window.CSR_CONFIRMED_ASSET && window.CSR_CONFIRMED_ASSET !== "") {
					console.log("Using emergency fallback asset: " + window.CSR_CONFIRMED_ASSET);
					return window.CSR_CONFIRMED_ASSET;
				}
			} catch (e) {
				// Ignore errors
			}
			
			try {
				// Method 5: Check localStorage as final fallback
				var savedAsset = localStorage.getItem("defaultAsset");
				if (savedAsset && savedAsset !== "" && savedAsset !== "null") {
					console.log("Using saved asset from localStorage: " + savedAsset);
					return savedAsset;
				}
			} catch (e) {
				// Ignore errors
			}
			
			return "";
		},

		_shouldBypassAssetCheck: function () {
			// Check if asset validation should be bypassed
			// This can be useful when asset is managed by external systems
			try {
				// Check if there's already an asset in the payment view model
				var oViewModel = this.getView().getModel("paymentViewModel");
				if (oViewModel) {
					var existingAsset = oViewModel.getProperty("/assestID");
					if (existingAsset && existingAsset !== "" && existingAsset !== "undefined") {
						return true;
					}
				}
				
				// Check if running in a context where assets are managed externally
				var hasExternalAssetManager = sap.ui.getCore().byId("currentAsset") || sap.ui.getCore().getModel("AssetModel");
				if (hasExternalAssetManager) {
					// If external asset management exists, assume it's handling validation
					return true;
				}
				
				// Check for emergency fallback asset (set by FLP extension)
				if (window.CSR_CONFIRMED_ASSET && window.CSR_CONFIRMED_ASSET !== "") {
					console.log("Found emergency fallback asset: " + window.CSR_CONFIRMED_ASSET);
					// Set it in the payment view model for consistency
					if (oViewModel) {
						oViewModel.setProperty("/assestID", window.CSR_CONFIRMED_ASSET);
					}
					return true;
				}
				
				// Check localStorage as additional fallback
				var savedAsset = localStorage.getItem("defaultAsset");
				if (savedAsset && savedAsset !== "" && savedAsset !== "null") {
					console.log("Found saved asset in localStorage: " + savedAsset);
					// Set it in the payment view model for consistency
					if (oViewModel) {
						oViewModel.setProperty("/assestID", savedAsset);
					}
					return true;
				}
			} catch (e) {
				// If any errors occur, don't bypass (safer approach)
				console.log("Error in _shouldBypassAssetCheck: " + e.message);
				return false;
			}
			
			return false;
		},

		_openDialog: function (cardAmount, cardPath, paymentHeaderDeepData) {
			if (!this._oDialog) {
				this._oDialog = sap.ui.xmlfragment("com.csr.order.view.fragment.SecureCoPaymentDialog", this);
				this.getView().addDependent(this._oDialog);
			}
			var oModel = new JSONModel({
				amount: cardAmount,
				cardType: "", // default to blank
				fee: 0,
				totalAmount: cardAmount,
				cardPercentage: 0,
				cardNumber: "",
				maskedNumber: "**** **** **** 3456",
				cvcNumber: "***",
				expirationMonth: "",
				expirationYear: "",
				firstName: "",
				lastName: "",
				CRNumber: "",
				prefixedCRNumber: "",
				SessionId: "",
				EndPoint: "",
				IsPCIActive: this.getOwnerComponent().getModel("customerModel").getProperty("/IsPCIActive"),
				IsCreditCardFeeActive: this.getOwnerComponent().getModel("customerModel").getProperty("/IsCreditCardFeeActive"),
				CCExpiryValidation: this.getOwnerComponent().getModel("customerModel").getProperty("/CCExpiryValidation"),
				SecurecoMerchantId: this.getOwnerComponent().getModel("customerModel").getProperty("/SecurecoMerchantId"),
				cardTypeSelectenabled: true,
				amountInputenabled: false,
				initiateSecureModeButtonenabled: false,
				checkSecureModeButtonenabled: true,
				copyCallIdButtonenabled: true,
				checkCardInfoButtonenabled: true,
				checkCvcStatusButtonenabled: true,
				resetCardButtonenabled: true,
				resetCVCButtonenabled: true,
				submitPaymentenabled: true,
				resetSession: false,
				amountmessageStripvisible: false,
				secureSessionErrorStripvisible: false,
				cardInfoErrorStripvisible: false,
				cvcInfoErrorStripvisible: false,
				additionalCardDetailsErrorStripvisible: false,
				cardPath: cardPath,
				vbeln: paymentHeaderDeepData.Vbeln,
				ccFeeDetails: {},
				IsAMEXAllowed: this.getOwnerComponent().getModel("customerModel").getProperty("/IsAMEXAllowed"),
				creditCardType: "",
				cardTypeSelected: false,
				cardTypeEnabled: true,
				resetCCInfoErrorVisible: false
			});
			this.getView().setModel(oModel, "secureCo");
			this._oDialog.setModel(this.getView().getModel("secureCo"));

			this.initiateCreditCardSurcharge("secureCo", cardPath);
			var oCustomerCockpit = this.getOwnerComponent().getModel("customerCockpitModel");

			if (oCustomerCockpit && oCustomerCockpit.getProperty("/receivePaymentOrder")) {
				this.getView().getModel("secureCo").setProperty("/vbeln", oCustomerCockpit.getProperty("/receivePaymentOrder"));
			}

			if (this.getView().getModel("secureCo").getProperty("/IsCreditCardFeeActive") === false) {
				this.getView().getModel("secureCo").setProperty("/initiateSecureModeButtonenabled", false);
				this.getView().getModel("creditCardModel").setProperty("/cardTypeSelected", true);
				this.onInitiateSecureModePress();
			}
			this._oDialog.open();
		},

		getCreditCardFees: function () {
			var oThis = this;
			var sSalesOrg = this.getOwnerComponent().getModel("customerModel").getProperty("/salesOrg");
			var sPlant = this.getOwnerComponent().getModel("orderHeaderModel").getProperty("/deliveryPlantCode");
			var sCustomerNumber = this.getOwnerComponent().getModel("customerModel").getProperty("/customerID");
			var sAmount = this.getOwnerComponent().getModel("orderHeaderModel").getProperty("/totalAmount");
			var oModel = this.getOwnerComponent().getModel("secureCo");

			oModel.read("/CreditCardFeeSet", {
				filters: [
					new sap.ui.model.Filter({
						path: "SalesOrg",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: sSalesOrg
					}),
					new sap.ui.model.Filter({
						path: "Plant",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: sPlant
					}),
					new sap.ui.model.Filter({
						path: "CustomerNumber",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: sCustomerNumber
					}),
					new sap.ui.model.Filter({
						path: "Amount",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: sAmount
					})
				],
				success: function (response) {
					oThis.getView().getModel("creditCardModel").setProperty("/ccFeeDetails", response);
				},
				error: function (oError) {
					MessageToast.show(
						this.getResourceBundle().getText("ccFeeFailed"), {
							duration: 2000
						});
				}
			});
		},

		getFeePercentage: function (cardType) {
			//getting the data from secureCo model property /ccFeeDetails
			var creditCardData = this.getView().getModel("creditCardModel").getProperty("/ccFeeDetails").results;

			if (creditCardData && creditCardData.length > 0) {
				var filteredData = creditCardData.filter(function (item) {
					return item.CreditCardType.replace(/\s+/g, '') === cardType.replace(/\s+/g, '');
				});

				if (filteredData.length > 0) {
					return parseFloat(filteredData[0].CreditCardFeePercentage.trim());
				}
			}
			return null;
		},

		getCardDescription: function (cardType) {
			var creditCardData = this.getView().getModel("creditCardModel").getProperty("/ccFeeDetails").results;

			if (creditCardData && creditCardData.length > 0) {
				var filteredData = creditCardData.filter(function (item) {
					return item.CreditCardType.replace(/\s+/g, '') === cardType.replace(/\s+/g, '');
				});

				if (filteredData.length > 0) {
					return filteredData[0].CCtypeShortDescription.trim();
				}
			}
			return null;
		},

		onAmountChange: function (oEvent) {
			var oSelectedRadioButton = oEvent.getSource();
			var oModel = this.getView().getModel("creditCardModel");
			var sSelectedText = oSelectedRadioButton.getId().replace("CreditCardFeeFragment--", "");
			sSelectedText = sSelectedText.replace(/-/g, ' ');

			var amount = parseFloat(this.getView().getModel("creditCardModel").getProperty("/amount"));
			var feePercentage = this.getFeePercentage(sSelectedText);
			oModel.setProperty("/cardPercentage", feePercentage);
			oModel.setProperty("/creditCardType", sSelectedText.replace(/-/g, ' '));
			oModel.setProperty("/cardTypeSelected", true);

			this.getView().getModel("secureCo").setProperty("/initiateSecureModeButtonenabled", true);

			if (feePercentage) {
				var fee = amount * feePercentage / 100;
				var totalAmount = amount + fee;

				this.getView().getModel("creditCardModel").setProperty("/fee", fee.toFixed(2));
				this.getView().getModel("creditCardModel").setProperty("/totalAmount", totalAmount.toFixed(2));
			}
		},

		onCardTypeChange: function (oEvent) {
			var oSelectedRadioButton = oEvent.getSource();
			var oModel = this.getView().getModel("creditCardModel");
			var sSelectedText = oSelectedRadioButton.getId().replace("CreditCardFeeFragment--", "");
			sSelectedText = sSelectedText.replace(/-/g, ' ');

			if (oModel.getProperty("/resetCard")) {
				oModel.setProperty("/resetCard", false);
			} else {
				var amount = parseFloat(this.getView().getModel("creditCardModel").getProperty("/amount"));
				var feePercentage = this.getFeePercentage(sSelectedText);
				var creditCardDescription = this.getCardDescription(sSelectedText);

				oModel.setProperty("/creditCardType", sSelectedText.replace(/-/g, ' '));
				oModel.setProperty("/cardTypeSelected", true);
				this.getView().getModel("secureCo").setProperty("/initiateSecureModeButtonenabled", true);

				if (creditCardDescription !== null) {
					oModel.setProperty("/CCtypeShortDescription", creditCardDescription);
				}

				if (feePercentage) {
					var fee = amount * feePercentage / 100;
					var totalAmount = amount + fee;

					oModel.setProperty("/cardPercentage", feePercentage);
					oModel.setProperty("/fee", fee.toFixed(2));
					oModel.setProperty("/totalAmount", totalAmount.toFixed(2));

				} else if (
					(feePercentage === null && oModel.getProperty("/isPinPad")) ||
					(feePercentage === 0)
				) {
					oModel.setProperty("/cardPercentage", 0);
					oModel.setProperty("/fee", "0");
					oModel.setProperty("/totalAmount", amount);
				}
			}
		},

		updateCCDetails: function (correctCard) {
			var oModel = this.getView().getModel("creditCardModel");
			var secureCoModel = this.getView().getModel("secureCo");
			var oRadioButton = sap.ui.core.Fragment.byId("CreditCardFeeFragment", correctCard);
			oRadioButton.setSelected(true);
			var feePercentage = this.getFeePercentage(correctCard);
			var amount = parseFloat(this.getView().getModel("creditCardModel").getProperty("/amount"));
			var creditCardModel = this.getView().getModel("creditCardModel");

			if (feePercentage) {
				var fee = amount * feePercentage / 100;
				var totalAmount = amount + fee;

				oModel.setProperty("/cardPercentage", feePercentage);
				oModel.setProperty("/creditCardType", correctCard);
				oModel.setProperty("/CCtypeShortDescription", this.getCardDescription(correctCard));

				oModel.setProperty("/fee", fee.toFixed(2));
				oModel.setProperty("/totalAmount", totalAmount.toFixed(2));
				oModel.setProperty("/resetCard", true);

				secureCoModel.setProperty("/fee", creditCardModel.getProperty("/fee"));
				secureCoModel.setProperty("/totalAmount", creditCardModel.getProperty("/totalAmount"));
				secureCoModel.setProperty("/creditCardType", creditCardModel.getProperty("/creditCardType"));
				secureCoModel.setProperty("/ccFeeDetails", creditCardModel.getProperty("/ccFeeDetails"));
			}
		},

		// Button press event handler
		onInitiateSecureModePress: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("secureCo");
			var getNextCRN = this.fnFunctionImport(oModel, "GET", "/GetNextCRN");
			var secureCoModel = this.getView().getModel("secureCo");
			var creditCardModel = this.getView().getModel("creditCardModel");

			secureCoModel.setProperty("/fee", creditCardModel.getProperty("/fee"));
			secureCoModel.setProperty("/totalAmount", creditCardModel.getProperty("/totalAmount"));
			secureCoModel.setProperty("/creditCardType", creditCardModel.getProperty("/creditCardType"));
			secureCoModel.setProperty("/ccFeeDetails", creditCardModel.getProperty("/ccFeeDetails"));
			secureCoModel.setProperty("/initiateSecureModeButtonenabled", false);

			this._oDialog.setBusy(true);
			getNextCRN.then(function (response) {
				this.getView().getModel("secureCo").setProperty("/amountmessageStripvisible", false);
				MessageToast.show(
					this.getResourceBundle().getText("getCRNSuccess"), {
						duration: 2000
					});
				var crNumber = response.GetNextCRN.CrNumber;
				var prefixedCrNumber = "##" + crNumber;
				this.getView().getModel("secureCo").setProperty("/CRNumber", response.GetNextCRN.CrNumber);
				this.getView().getModel("secureCo").setProperty("/prefixedCRNumber", prefixedCrNumber);
				this.getView().getModel("secureCo").setProperty("/SessionId", response.GetNextCRN.SessionId);
				this.getView().getModel("secureCo").setProperty("/EndPoint", "");
				this._displayStep2();

				this._oDialog.setBusy(false);
			}.bind(this)).catch(function (Error) {
				this.getView().getModel("secureCo").setProperty("/amountmessageStripvisible", false);
				var wizard = this._oDialog.getContent()[0];
				var step = wizard.getSteps()[0];
				wizard.discardProgress();
				wizard.setCurrentStep(step);
				sap.ui.getCore().byId("amountErrorStrip").setText(this.getResourceBundle().getText("failedCRN"));
				this._oDialog.setBusy(false);
			}.bind(this));
		},

		onCheckSecureModePress: function (oEvent) {
			var oModel = this.getOwnerComponent().getModel("secureCo");
			var sCrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
			var sSessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
			var mParameters = {
				SessionId: sSessionId,
				CrNumber: sCrNumber
			};
			var getSecureSession = this.fnFunctionImport(oModel, "POST", "/GetSecureSession", mParameters);
			this._oDialog.setBusy(true);
			getSecureSession.then(function (response) {
				this.getView().getModel("secureCo").setProperty("/secureSessionErrorStripvisible", false);
				// MessageToast.show(
				// 	this.getResourceBundle().getText("getCRNSuccess"), {
				// 		duration: 1000
				// 	});
				this.getView().getModel("secureCo").setProperty("/EndPoint", response.GetSecureSession.EndPoint);
				if (response.GetSecureSession.SessionId !== "") {
					this.getView().getModel("secureCo").setProperty("/SessionId", response.GetSecureSession.SessionId);
				}
				if (response.GetSecureSession.EndPoint === "") {
					this.getView().getModel("secureCo").setProperty("/secureSessionErrorStripvisible", true);
					sap.ui.getCore().byId("secureSessionErrorStrip").setText(this.getResourceBundle().getText("failedSecureSession"));
					this.getView().getModel("secureCo").setProperty("/resetSession", false);
				} else {
					this.getView().getModel("secureCo").setProperty("/resetSession", true);
					this._displayStep3();
				}
				this._oDialog.setBusy(false);
			}.bind(this)).catch(function (Error) {
				debugger;
				this.getView().getModel("secureCo").setProperty("/secureSessionErrorStripvisible", true);
				sap.ui.getCore().byId("secureSessionErrorStrip").setText(this.getResourceBundle().getText("failedSecureSession"));
				this._oDialog.setBusy(false);
			}.bind(this));
		},

		_displayStep1: function () {
			console.log("Displaying step 1");
			var oDialog = this._oDialog;
			var oWizard = oDialog.getContent()[0]; // Get Wizard
			oWizard.getSteps()[0].setVisible(false); // Hide Step 1
			this.getView().getModel("secureCo").setProperty("/cardTypeEnabled", true);
			oWizard.setCurrentStep(oWizard.getSteps()[0]);
		},

		_displayStep2: function () {
			console.log("Displaying step 2");
			var oDialog = this._oDialog;
			var oWizard = oDialog.getContent()[0]; // Get Wizard
			oWizard.getSteps()[0].setVisible(false); // Hide Step 1
			oWizard.setCurrentStep(oWizard.getSteps()[1]);
			this.getView().getModel("secureCo").setProperty("/initiateSecureModeButtonenabled", false);
			this.getView().getModel("secureCo").setProperty("/secureSessionErrorStripvisible", false);
			this.getView().getModel("secureCo").setProperty("/cardTypeEnabled", false);
			// sap.ui.getCore().byId("cancelButton").setEnabled(false);
		},

		_displayStep3: function () {
			console.log("Displaying step 3");
			var oDialog = this._oDialog;
			var oWizard = oDialog.getContent()[0]; // Get Wizard
			oWizard.getSteps()[1].setVisible(false); // Hide Step 1
			oWizard.setCurrentStep(oWizard.getSteps()[2]);
			this.getView().getModel("secureCo").setProperty("/checkSecureModeButtonenabled", false);
			this.getView().getModel("secureCo").setProperty("/copyCallIdButtonenabled", false);
			this.getView().getModel("secureCo").setProperty("/cardTypeSelectenabled", false);
			this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", false);
			this.getView().getModel("secureCo").setProperty("/amountInputenabled", false);
			this.getView().getModel("secureCo").setProperty("/cardType", "");
			this.getView().getModel("secureCo").setProperty("/resetCCInfoErrorVisible", false);
		},

		_displayStep4: function () {
			console.log("Displaying step 4");
			var oDialog = this._oDialog;
			var oWizard = oDialog.getContent()[0]; // Get Wizard
			oWizard.getSteps()[2].setVisible(false); // Hide Step 1
			oWizard.setCurrentStep(oWizard.getSteps()[3]);
			this.getView().getModel("secureCo").setProperty("/checkCardInfoButtonenabled", false);
			this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", false);
			// sap.ui.getCore().byId("resetCardInfoButton").setEnabled(false);
		},

		_displayStep5: function () {
			console.log("Displaying step 5");
			var oDialog = this._oDialog;
			var oWizard = oDialog.getContent()[0]; // Get Wizard
			oWizard.getSteps()[3].setVisible(false); // Hide Step 1
			oWizard.setCurrentStep(oWizard.getSteps()[4]);
			this.getView().getModel("secureCo").setProperty("/checkCvcStatusButtonenabled", false);
			this.getView().getModel("secureCo").setProperty("/resetCardButtonenabled", false);
			this.getView().getModel("secureCo").setProperty("/resetCVCButtonenabled", false);
			this.getView().getModel("secureCo").setProperty("/additionalCardDetailsErrorStripvisible", false);
			this.getView().getModel("secureCo").setProperty("/expirationMonth", "");
			this.getView().getModel("secureCo").setProperty("/expirationYear", "");
			this.getView().getModel("secureCo").setProperty("/firstName", "");
			this.getView().getModel("secureCo").setProperty("/lastName", "");
			// sap.ui.getCore().byId("resetCvcButton").setEnabled(false);
		},

		onCheckCardInfoPress: function (oEvent) {
			console.log("On Check Card Status Press in Credit Card: Call API no 3 Get Secured Card Details");
			var oModel = this.getOwnerComponent().getModel("secureCo");
			var sCrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
			var sSessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
			var sEndPoint = this.getView().getModel("secureCo").getProperty("/EndPoint");
			var mParameters = {
				CrNumber: sCrNumber,
				SessionId: sSessionId,
				EndPoint: sEndPoint
			};
			this._oDialog.setBusy(true);
			//Need to add validation logic.
			this.fnFunctionImport(oModel, "POST", "/GetSecureCardDetails", mParameters)
				.then(function (oData) {
					console.log(oData);
					this._oDialog.setBusy(false);
					var panStatus = oData.GetSecureCardDetails.PANStatus;
					var panCount = parseInt(oData.GetSecureCardDetails.PANCount);
					var panLength = parseInt(oData.GetSecureCardDetails.PANLength);
					var panMask = oData.GetSecureCardDetails.PANMask;
					var panType = oData.GetSecureCardDetails.PANType;
					var captureStatus = oData.GetSecureCardDetails.CaptureStatus;
					if (panStatus === "ACTIVE" && panCount < panLength) {
						if (panCount === 0) {
							this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
							sap.ui.getCore().byId("cardInfoErrorStrip").setText(this.getResourceBundle().getText("nullCreditCard"));
						} else {
							this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
							var oMessageStrip = sap.ui.getCore().byId("cardInfoErrorStrip");
							var aIncompleteCreditCardText = [];
							aIncompleteCreditCardText = [
								this.getView().getModel("i18n").getResourceBundle().getText("incompleteCreditCard"),
								this.getView().getModel("i18n").getResourceBundle().getText("incompleteCreditCardNumber", [panMask])
							]
							oMessageStrip.setText(aIncompleteCreditCardText.join("\n"));
						}
					} else if (panStatus === "FAIL") {
						// Display message and call "Reset PAN" API Automatically
						this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
						sap.ui.getCore().byId("cardInfoErrorStrip").setText(this.getResourceBundle().getText("invalidCreditCard"));
						this.fnFunctionImport(oModel, "POST", "/ResetPAN", mParameters)
							.then(function (oData) {
								MessageToast.show(
									this.getResourceBundle().getText("getPANSucess"), {
										duration: 1000
									});
								// Display screen 3
								this.getView().getModel("secureCo").setProperty("/checkCardInfoButtonenabled", true);
								this._oDialog.setBusy(false);
							}.bind(this))
							.catch(function (error) {
								this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
								sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("failedPANReset"));
								this._oDialog.setBusy(false);
							}.bind(this));
					} else if (panStatus === "EXPIRED" || captureStatus === "EXPIRED") {
						// Display message and call "API RESET_SESSION" upon closing the error message
						MessageBox.error("Secure Session is Timed Out, please re-initiate Secure connection", {
							title: this.getResourceBundle().getText("confirm"),
							onClose: function (oAction) {
								if (oAction === sap.m.MessageBox.Action.OK) {
									this._oDialog.setBusy(true);
									this.fnFunctionImport(oModel, "POST", "/ResetSession", mParameters)
										.then(function (oData) {
											this._oDialog.setBusy(false);
											// Redirect to Screen 2 with new CR Number
											this.fnControlButtons();
											this.onInitiateSecureModePress();
										}.bind(this))
										.catch(function (error) {
											this._oDialog.setBusy(false);
											this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
											sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("errorResetSession"));
										}.bind(this));
								}
							}.bind(this)
						});
					} else if (panType === "AMEX" && !this.getView().getModel("creditCardModel").getProperty("/isAMEXAllowed")) {
						this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
						var oMessageStrip = sap.ui.getCore().byId("cardInfoErrorStrip");
						oMessageStrip.setText(this.getView().getModel("i18n").getResourceBundle().getText("amexNotAllowed"));
						this.fnFunctionImport(oModel, "POST", "/ResetPAN", mParameters)
							.then(function (oData) {
								MessageToast.show(
									this.getResourceBundle().getText("getPANSucess"), {
										duration: 1000
									});
								// Display screen 3
								this.getView().getModel("secureCo").setProperty("/checkCardInfoButtonenabled", true);
								this._oDialog.setBusy(false);
							}.bind(this))
							.catch(function (error) {
								this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
								sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("failedPANReset"));
								this._oDialog.setBusy(false);
							}.bind(this));
					}
					// Display message
					else {
						// Valid Card No, move "panType" and "panMask" to credit card screen fields for display
						this.getView().getModel("secureCo").setProperty("/cardType", panType);
						this.getView().getModel("secureCo").setProperty("/cardNumber", panMask);
						// Check if card type returned is the same as selected card type
						// if (this.getView().getModel("secureCo").getProperty("/cardType") !== panType) {
						// 	// Recalculate fees logic goes here
						// 	// Calculate card fee based on card type return from API
						// 	// (Refer to function ZFIR_CARD_FEES for fee to charge)
						// 	// Update "Credit Card Fee and Total Amount" value in the screen
						// 	// Show a message that "Selected Credit Card is XXXX, Credit Card fee is re-calculated"
						// }
						this._setCardTypeChangedMessage(panType);
						this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", false);
						this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", false);
						this.getView().getModel("secureCo").setProperty("/checkCardInfoButtonenabled", false);
						this._displayStep4();
					}
				}.bind(this))
				.catch(function (error) {
					this._oDialog.setBusy(false);
					this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
					sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("failedCardRetrieve"));
					// sap.m.MessageBox.error("Failed to retrieve credit card details");
				}.bind(this));
		},

		_setCardTypeChangedMessage: function (cardTypeFromAPI) {
			if (this.getView().getModel("secureCo").getProperty("/IsCreditCardFeeActive")) {
				var selectedCardType = this.getView().getModel("creditCardModel").getProperty("/CCtypeShortDescription");
				if (selectedCardType !== cardTypeFromAPI && selectedCardType) {
					this.getView().getModel("secureCo").setProperty("/cardTypeChangedMessage", this.getResourceBundle().getText(
						"cardTypeChangeMessage", cardTypeFromAPI));
					this.updateCCDetails(cardTypeFromAPI);
					this.getView().getModel("secureCo").setProperty("/resetCCInfoErrorVisible", true);
				}
			}
		},

		onCheckCvcStatusPress: function (oEvent) {
			console.log("On Check Card Info Press in CVN: Call API no 3 Get Secured Card Details");
			var oModel = this.getOwnerComponent().getModel("secureCo");
			var sCrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
			var sSessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
			var sEndPoint = this.getView().getModel("secureCo").getProperty("/EndPoint");
			var mParameters = {
				CrNumber: sCrNumber,
				SessionId: sSessionId,
				EndPoint: sEndPoint
			};
			//Need to add validation logic in here
			this._oDialog.setBusy(true);
			this.fnFunctionImport(oModel, "POST", "/GetSecureCardDetails", mParameters)
				.then(function (oData) {
					console.log(oData);
					this._oDialog.setBusy(false);
					var cvcStatus = oData.GetSecureCardDetails.CVCStatus;
					var cvcCount = parseInt(oData.GetSecureCardDetails.CVCCount);
					var cvcLength = parseInt(oData.GetSecureCardDetails.CVCLength);
					var cvcMask = oData.GetSecureCardDetails.CVCMask;
					var captureStatus = oData.GetSecureCardDetails.CaptureStatus;
					if (cvcStatus === "ACTIVE" && cvcCount < cvcLength) {
						if (cvcCount === 0) {
							this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", true);
							sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("nullCVC"));
						} else {
							this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", true);
							var oMessageStrip = sap.ui.getCore().byId("cvcInfoErrorStrip");
							var aIncompleteCVCText = [];
							aIncompleteCVCText = [
								this.getView().getModel("i18n").getResourceBundle().getText("incompleteCVC"),
								this.getView().getModel("i18n").getResourceBundle().getText("incompleteCVCNumber", [cvcMask])
							]
							oMessageStrip.setText(aIncompleteCVCText.join("\n"));
						}
						// this.getView().getModel("secureCo").setProperty("/cvcNumber", cvcMask);
						// this.getView().getModel("secureCo").setProperty("/submitPaymentenabled", false);
						// this._displayStep5();
						// this.getView().getModel("secureCo").setProperty("/checkCvcStatusButtonenabled", true);
						// this.getView().getModel("secureCo").setProperty("/additionalCardDetailsErrorStripvisible", true);
						// sap.ui.getCore().byId("additionalCardDetailsErrorStrip").setText(this.getResourceBundle().getText("incompleteCVC"));
					} else if (cvcStatus === "EXPIRED") {
						// Display message and call "API RESET_SESSION" upon closing the error message
						MessageBox.error(this.getResourceBundle().getText("secureSessionTimedOut"), {
							title: this.getResourceBundle().getText("confirm"),
							onClose: function (oAction) {
								if (oAction === sap.m.MessageBox.Action.OK) {
									this._oDialog.setBusy(true);
									this.fnFunctionImport(oModel, "POST", "/ResetSession", mParameters)
										.then(function (oData) {
											this._oDialog.setBusy(false);
											// Redirect to Screen 2 with new CR Number
											this.fnControlButtons();
											this.onInitiateSecureModePress();
										}.bind(this))
										.catch(function (error) {
											this._oDialog.setBusy(false);
											// sap.m.MessageBox.error("Error resetting session");
											this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", true);
											sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("errorResetSession"));
										}.bind(this));
								}
							}.bind(this)
						});
					} else if (cvcStatus === "COMPLETE" && captureStatus !== "COMPLETE") {
						// Display message and call "API RESET_SESSION" upon closing the error message
						MessageBox.error(this.getResourceBundle().getText("secureSessionTimedOut"), {
							title: this.getResourceBundle().getText("confirm"),
							onClose: function (oAction) {
								if (oAction === sap.m.MessageBox.Action.OK) {
									this._oDialog.setBusy(true);
									this.fnFunctionImport(oModel, "POST", "/ResetSession", mParameters)
										.then(function (oData) {
											this._oDialog.setBusy(false);
											// Redirect to Screen 2 with new CR Number
											this.fnControlButtons();
											this.onInitiateSecureModePress();
										}.bind(this))
										.catch(function (error) {
											this._oDialog.setBusy(false);
											// sap.m.MessageBox.error("Error resetting session");
											this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", true);
											sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("errorResetSession"));
										}.bind(this));
								}
							}.bind(this)
						});
					} else {
						// Valid CVC
						this.getView().getModel("secureCo").setProperty("/cvcNumber", cvcMask);
						this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", false);
						this.getView().getModel("secureCo").setProperty("/checkCvcStatusButtonenabled", false);
						this.getView().getModel("secureCo").setProperty("/resetCardButtonenabled", false);
						this.getView().getModel("secureCo").setProperty("/resetCVCButtonenabled", false);
						this.getView().getModel("secureCo").setProperty("/additionalCardDetailsErrorStripvisible", false);
						this.getView().getModel("secureCo").setProperty("/submitPaymentenabled", true);
						this._displayStep5();
					}
					// this._displayStep5();
				}.bind(this))
				.catch(function (error) {
					this._oDialog.setBusy(false);
					// MessageToast.show("Failed to retrieve credit card details");
					this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", true);
					sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("failedCVCretrieve"));
					// sap.m.MessageBox.error("Failed to retrieve credit card details");
				}.bind(this));
		},

		onCheckAdditionalStatusPress: function (oEvent) {
			console.log("On Check Card Info Press in Additional Details: Call API getSecureSession");
		},

		onCopyCallIdPress: function () {
			var crNumber = this.getView().getModel("secureCo").getProperty("/prefixedCRNumber");
			navigator.clipboard.writeText(crNumber).then(function () {
				MessageToast.show(this.getResourceBundle().getText("crCopiedToClipboard"));
			}, function (err) {
				console.error("Error copying to clipboard: ", err);
			});
		},

		onCancelSessionPress: function () {
			MessageBox.confirm(this.getResourceBundle().getText("confirmResetSession"), {
				title: this.getResourceBundle().getText("confirm"),
				onClose: function (oAction) {
					if (oAction === sap.m.MessageBox.Action.OK) {
						this._ResetSession("sessionReset");
					}
				}.bind(this)
			});
		},

		fnControlButtons: function () {
			this.getView().getModel("secureCo").setProperty("/amountInputenabled", false);
			this.getView().getModel("secureCo").setProperty("/initiateSecureModeButtonenabled", true);
			this.getView().getModel("secureCo").setProperty("/checkSecureModeButtonenabled", true);
			this.getView().getModel("secureCo").setProperty("/copyCallIdButtonenabled", true);
			this.getView().getModel("secureCo").setProperty("/checkCardInfoButtonenabled", true);
			this.getView().getModel("secureCo").setProperty("/checkCvcStatusButtonenabled", true);
			this.getView().getModel("secureCo").setProperty("/resetCardButtonenabled", true);
			this.getView().getModel("secureCo").setProperty("/resetCVCButtonenabled", true);
			this.getView().getModel("secureCo").setProperty("/submitPaymentenabled", true);
			this.getView().getModel("secureCo").setProperty("/resetSession", false);
			this.updateCCDetails("MASTERCARD");
		},

		onResetCardPress: function () {
			console.log("On Reset Card: Call API no 4 for Reset PAN and navigate to the step for card details");
			var oModel = this.getOwnerComponent().getModel("secureCo");
			var sCrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
			var sSessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
			var sEndPoint = this.getView().getModel("secureCo").getProperty("/EndPoint");
			var mParameters = {
				CrNumber: sCrNumber,
				SessionId: sSessionId,
				EndPoint: sEndPoint
			};
			this._oDialog.setBusy(true);
			this.fnFunctionImport(oModel, "POST", "/GetSecureCardDetails", mParameters)
				.then(function (oData) {
					var cvcStatus = oData.GetSecureCardDetails.CVCStatus;
					if (cvcStatus === "COMPLETE") {
						this._ResetSession("cvcEnteredSessionReset");
					} else {
						this.fnFunctionImport(
								this.getOwnerComponent().getModel("secureCo"),
								"POST",
								"/ResetPAN", {
									CrNumber: this.getView().getModel("secureCo").getProperty("/CRNumber"),
									SessionId: this.getView().getModel("secureCo").getProperty("/SessionId"),
									EndPoint: this.getView().getModel("secureCo").getProperty("/EndPoint")
								}
							)
							.then(function (oData) {
								MessageToast.show(
									this.getResourceBundle().getText("getPANSucess"), {
										duration: 1000
									});
								var wizard = this._oDialog.getContent()[0];
								var step = wizard.getSteps()[2]; //sTEP 3
								this.getView().getModel("secureCo").setProperty("/checkCardInfoButtonenabled", true);
								this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", false);
								this.getView().getModel("secureCo").setProperty("/cardType", "");
								this.getView().getModel("secureCo").setProperty("/resetCCInfoErrorVisible", false);
								// sap.ui.getCore().byId("resetCardInfoButton").setEnabled(true);
								wizard.discardProgress();
								wizard.setCurrentStep(step);
								this._oDialog.setBusy(false);
							}.bind(this))
							.catch(function (error) {
								this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
								sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("failedPANReset"));
								this._oDialog.setBusy(false);
							}.bind(this));
					}
				}.bind(this))
				.catch(function (oError) {
					this._oDialog.setBusy(false);
					this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
					sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("failedCardRetrieve"));
				}.bind(this));

		},

		onResetCvcPress: function () {
			console.log("On Reset CVC: Call API no 5 for Reset CVC and Navigate to CVC step");
			var oModel = this.getOwnerComponent().getModel("secureCo");
			var sCrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
			var sSessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
			var sEndPoint = this.getView().getModel("secureCo").getProperty("/EndPoint");
			var mParameters = {
				CrNumber: sCrNumber,
				SessionId: sSessionId,
				EndPoint: sEndPoint
			};
			this._oDialog.setBusy(true);

			this.fnFunctionImport(oModel, "POST", "/GetSecureCardDetails", mParameters)
				.then(function (oData) {
					var cvcStatus = oData.GetSecureCardDetails.CVCStatus;
					if (cvcStatus === "COMPLETE") {
						this._ResetSession("cvcEnteredSessionReset");
					} else {
						this.fnFunctionImport(
								this.getOwnerComponent().getModel("secureCo"),
								"POST",
								"/ResetCVC", {
									CrNumber: this.getView().getModel("secureCo").getProperty("/CRNumber"),
									SessionId: this.getView().getModel("secureCo").getProperty("/SessionId"),
									EndPoint: this.getView().getModel("secureCo").getProperty("/EndPoint")
								}
							)
							.then(function (oData) {
								console.log(oData);
								MessageToast.show(this.getResourceBundle().getText("cvcReset"));
								var wizard = this._oDialog.getContent()[0];
								var step = wizard.getSteps()[3]; //sTEP 4
								this.getView().getModel("secureCo").setProperty("/checkCvcStatusButtonenabled", true);
								this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", false);
								// this.getView().getModel("secureCo").setProperty("/resetCardButtonenabled", true);
								wizard.discardProgress();
								wizard.setCurrentStep(step);
								this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", false);
								this._oDialog.setBusy(false);
							}.bind(this))
							.catch(function (error) {
								this.getView().getModel("secureCo").setProperty("/cvcInfoErrorStripvisible", true);
								sap.ui.getCore().byId("cardInfoErrorStrip").setText(this.getResourceBundle().getText("failedSecureSession"));
								this._oDialog.setBusy(false);
							}.bind(this));
					}
				}.bind(this))
				.catch(function (oError) {
					this._oDialog.setBusy(false);
					this.getView().getModel("secureCo").setProperty("/cardInfoErrorStripvisible", true);
					sap.ui.getCore().byId("cvcInfoErrorStrip").setText(this.getResourceBundle().getText("failedCardRetrieve"));
				}.bind(this))

		},

		onExpirationMonthChange: function (oEvent) {
			this.validateExpirationMonth(oEvent);
		},

		onExpirationYearChange: function (oEvent) {
			this.validateExpirationYear(oEvent);
		},

		onFirstNameChange: function (oEvent) {
			this.validateFirstName(oEvent);
		},

		onLastNameChange: function (oEvent) {
			this.validateLastName(oEvent);
		},

		validateExpirationMonth: function (oEvent, isSubmitPayment) {
			if (this.getView().getModel("secureCo").getProperty("/CCExpiryValidation") === true) {
				var sValue = oEvent.getSource().getValue();
				if (sValue < 1 || sValue > 12) {
					var sInvalidMonthText = this.getResourceBundle().getText("invalidMonth");
					oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
					oEvent.getSource().setValueStateText(sInvalidMonthText);
					if (isSubmitPayment) {
						this.aErrorMessages.push(sInvalidMonthText);
					}
				} else {
					oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
				}
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
		},
		validateExpirationYear: function (oEvent, isSubmitPayment) {
			if (this.getView().getModel("secureCo").getProperty("/CCExpiryValidation") === true) {
				var sValue = oEvent.getSource().getValue();
				var iCurrentYear = new Date().getFullYear();
				if (sValue.length !== 4 || sValue < iCurrentYear || sValue > iCurrentYear + 5) {
					var sInvalidYearText = this.getResourceBundle().getText("invalidYear");
					oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
					oEvent.getSource().setValueStateText(sInvalidYearText);
					if (isSubmitPayment) {
						this.aErrorMessages.push(sInvalidYearText);
					}
				} else {
					oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
				}
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
		},

		validateFirstName: function (oEvent) {
			var sValue = oEvent.getSource().getValue();
			if (sValue === "") {
				this.aErrorMessages.push(this.getResourceBundle().getText("enterFirstName"));
			}
		},

		validateLastName: function (oEvent) {
			var sValue = oEvent.getSource().getValue();
			if (sValue === "") {
				this.aErrorMessages.push(this.getResourceBundle().getText("enterLastName"));
			}
		},

		validateCreditCardExpiry: function (dateSources) {
			var sInputMonth = parseInt(dateSources.dateSources.oMonth.getValue()),
				sInputYear = parseInt(dateSources.dateSources.oYear.getValue()),
				sCurrentMonth = new Date().getMonth() + 1,
				sCurentYear = new Date().getFullYear(),
				isCreditCardExpired = false;
			isCreditCardExpired = (sInputYear === sCurentYear && sInputMonth < sCurrentMonth) ||
				(sInputYear < sCurentYear) ?
				true : false;
			if (isCreditCardExpired) {
				this.aErrorMessages.push(this.getResourceBundle().getText("creditCardExpired"));
			}
		},

		onSubmitPayment: function (oEvent) {
			var oModel = this.getView().getModel("secureCo");
			var oBackendModel = this.getOwnerComponent().getModel("secureCo");
			var secureCoModelData = oModel.getData();
			this.aErrorMessages = [];
			if (secureCoModelData.expirationMonth === "") {
				this.aErrorMessages.push(this.getResourceBundle().getText("enterExpirationMonth"));
			}
			if (secureCoModelData.expirationYear === "") {
				this.aErrorMessages.push(this.getResourceBundle().getText("enterExpirationYear"));
			}

			this.validateExpirationMonth({
				getSource: function () {
					return sap.ui.getCore().byId("expirationMonthInput");
				}
			}, true);
			this.validateExpirationYear({
				getSource: function () {
					return sap.ui.getCore().byId("expirationYearInput");
				}
			}, true);
			this.validateFirstName({
				getSource: function () {
					return sap.ui.getCore().byId("firstNameInput");
				}
			}, true);
			this.validateLastName({
				getSource: function () {
					return sap.ui.getCore().byId("lastNameInput");
				}
			});
			this.validateCreditCardExpiry({
				"dateSources": {
					"oMonth": sap.ui.getCore().byId("expirationMonthInput"),
					"oYear": sap.ui.getCore().byId("expirationYearInput")
				}
			});

			if (this.aErrorMessages.length > 0) {
				this.getView().getModel("secureCo").setProperty("/additionalCardDetailsErrorStripvisible", true);
				sap.ui.getCore().byId("additionalCardDetailsErrorStrip").setText(this.aErrorMessages.join("\n"));
				// this.getView().getModel("secureCo").setProperty("/additionalCardDetailsErrorStripText", this.aErrorMessages.join("\n"));
			} else {
				// Proceed with payment submission
				this._oDialog.setBusy(true);
				var oPost = {};
				oPost.CrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
				oPost.SessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
				oPost.EndPoint = this.getView().getModel("secureCo").getProperty("/EndPoint");
				oPost.MerchantAccountId = this.getOwnerComponent().getModel("customerModel").getProperty("/SecurecoMerchantId");
				oPost.RequestId = "";
				if (this.getView().getModel("secureCo").getProperty("/IsCreditCardFeeActive") === true) {
					oPost.SurchargeAmount = this.getView().getModel("secureCo").getProperty("/fee"); //if not in creditcard mode and pass surcharge, we get an error
				}
				oPost.RequestedAmount = this.getView().getModel("secureCo").getProperty("/amount");
				oPost.Currency = "";
				oPost.EntryMode = "";
				oPost.OrderNumber = this.getView().getModel("secureCo").getProperty("/vbeln");
				oPost.PaymentMethod = "";
				oPost.FirstName = this.getView().getModel("secureCo").getProperty("/firstName");
				oPost.LastName = this.getView().getModel("secureCo").getProperty("/lastName");
				oPost.ExpiryMonth = this.getView().getModel("secureCo").getProperty("/expirationMonth");
				oPost.ExpiryYear = this.getView().getModel("secureCo").getProperty("/expirationYear");
				this._oDialog.setBusy(true);
				this.fnCreateEntity(oBackendModel, "/PurchaseSet", oPost)
					.then(function (response) {
						this._oDialog.setBusy(false);
						this.getView().getModel("secureCo").setProperty("/additionalCardDetailsErrorStripvisible", false);
						this.getView().getModel("secureCo").setProperty("/submitPaymentenabled", false);
						MessageToast.show(
							this.getResourceBundle().getText("getPaymentSuccess"), {
								duration: 1000
							});
						this._oDialog.close();
						this._oDialog.destroy();
						this._oDialog = undefined;
						var fTotal = parseFloat(this.getView().getModel("paymentViewModel").getProperty("/totalAmount"));
						var fPaid = parseFloat(this.getView().getModel("secureCo").getProperty("/amount")) + parseFloat(this.getView().getModel(
							"paymentViewModel").getProperty("/paid"));
						var fPayable = (fTotal - fPaid).toFixed(2);
						this.getView().getModel("paymentViewModel").setProperty("/paid", fPaid.toFixed(2));
						this.getView().getModel("paymentViewModel").setProperty("/payableAmount", fPayable);
						var sCardPath = this.getView().getModel("secureCo").getProperty("/cardPath");
						this.getView().getModel("paymentViewModel").setProperty(sCardPath + "/isEditable", false);
						this.getView().getModel("paymentViewModel").setProperty(sCardPath + "/referenceNo", response.ProviderTransactionId);
						this.triggerPaymentHeader("", response.RequestId, secureCoModelData.amount, secureCoModelData.cardPath, false, false, true);
					}.bind(this))
					.catch(function (error) {
						this._oDialog.setBusy(false);
						this.getView().getModel("secureCo").setProperty("/additionalCardDetailsErrorStripvisible", true);
						this.getView().getModel("secureCo").setProperty("/submitPaymentenabled", true);
						// this.getView().getModel("secureCo").setProperty("/resetCVCButtonenabled", true);
						var errorResponse;
						var errorMessage = "";
						try {
							errorResponse = JSON.parse(error.responseText);
							if (errorResponse && errorResponse.error && errorResponse.error.innererror && errorResponse.error.innererror.errordetails) {
								var errorDetails = errorResponse.error.innererror.errordetails.filter((error) => error.code !==
									"/IWBEP/CX_MGW_BUSI_EXCEPTION");
								errorMessage = errorDetails.map(current => current.message).join("\n");
							} else if (errorResponse && errorResponse.message) {
								errorMessage = errorResponse.message.value;
							} else {
								errorMessage = this.getResourceBundle().getText("errorPurchaseSet");
							}
						} catch (e) {
							errorMessage = this.getResourceBundle().getText("errorPurchaseSet");
						}
						sap.ui.getCore().byId("additionalCardDetailsErrorStrip").setText(errorMessage);
					}.bind(this));
			}
		},

		onClose: function () {
			MessageBox.confirm(this.getResourceBundle().getText("confirmCloseSession"), {
				title: this.getResourceBundle().getText("confirm"),
				onClose: function (oAction) {
					if (oAction === sap.m.MessageBox.Action.OK) {
						var oModel = this.getOwnerComponent().getModel("secureCo");
						var sCrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
						var sSessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
						var sEndPoint = this.getView().getModel("secureCo").getProperty("/EndPoint");
						if (sCrNumber === "" || sSessionId === "" || sEndPoint === "") {
							this._oDialog.close();
							this._oDialog.destroy();
							this._oDialog = undefined;
						} else {
							var mParameters = {
								CrNumber: sCrNumber,
								SessionId: sSessionId,
								EndPoint: sEndPoint
							};
							this._oDialog.setBusy(true);
							this.fnFunctionImport(oModel, "POST", "/ResetSession", mParameters)
								.then(function (oData) {
									this._oDialog.setBusy(false);
									MessageToast.show("Session was reset");
									this._oDialog.close();
									this._oDialog.destroy();
									this._oDialog = undefined;
								}.bind(this))
								.catch(function (error) {
									this._oDialog.setBusy(false);
									this._oDialog.close();
									this._oDialog.destroy();
									this._oDialog = undefined;
									sap.m.MessageBox.error(this.getResourceBundle().getText("errorResetSession"));
								}.bind(this));
						}
					}
				}.bind(this)
			});
		},

		_ResetSession: function (textIDOnSuccessReset) {
				var oModel = this.getOwnerComponent().getModel("secureCo");
				var sCrNumber = this.getView().getModel("secureCo").getProperty("/CRNumber");
				var sSessionId = this.getView().getModel("secureCo").getProperty("/SessionId");
				var sEndPoint = this.getView().getModel("secureCo").getProperty("/EndPoint");
				var mParameters = {
					CrNumber: sCrNumber,
					SessionId: sSessionId,
					EndPoint: sEndPoint
				};
				this._oDialog.setBusy(true);
				this.fnFunctionImport(oModel, "POST", "/ResetSession", mParameters)
					.then(function (oData) {
						this._oDialog.setBusy(false);
						MessageToast.show(this.getResourceBundle().getText(textIDOnSuccessReset));
						this.fnControlButtons();
						this.onInitiateSecureModePress();
					}.bind(this))
					.catch(function (error) {
						this._oDialog.setBusy(false);
						sap.m.MessageBox.error(this.getResourceBundle().getText("errorResetSession"));
					}.bind(this));
			}
			// Payment Card Industry (PCI) Compliance related changes end
	});

});
//# sourceURL=https://webidetesting7126894-cc7c2b28c.dispatcher.ap1.hana.ondemand.com/webapp/controller/Payment.controller.js?eval