/*Change History
 ***********************************************************************
 * Date         Incident      Author      Description
 * --------    -----------  ---------    ------------------
 *1/6/2018     274868/2018  C5253525    ePOS order entry screen - duplicated payment
 *10/12/2018   566237/2018  C5267297    TATP Date format to be in string
 ***********************************************************************
 */
sap.ui.define([
	"sap/ui/core/format/DateFormat"
], function (DateFormat) {
	"use strict";

	return {
		/**
		 * Rounds the currency value to 2 digits
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue: function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},
		displayCheckoutButton: function (sValue) {
			if (sValue === true) {
				return false;
			}
			return true;
		},
		displayValue: function (sValue) {
			if (!sValue) {
				return false;
			}
			return true;
		},
		itemAmount: function (quantity, price) {
			if (!quantity || !price) {
				return "";
			}
			return parseFloat(quantity * price).toFixed(2);
		},
		enableButton: function (sValue) {
			if (!sValue) {
				return false;
			}
			return true;
		},
		enableCashCustomer: function (sValue) {
			if (sValue && sValue === "CASH") {
				return true;
			} else if (sValue) {
				return false;
			}
			return false;
		},
		enableBillingButton: function (sValue) {
			if (!sValue) {
				return true;
			}
			return false;
		},
		enableDeliveryButton: function (sValue) {
			if (!sValue) {
				return true;
			}
			return false;
		},
		formatDate: function (value) {
			var currentDate = new Date(value);
			var year = currentDate.getFullYear();
			var date = currentDate.getDate();
			var month = currentDate.getMonth() + 1;
			return year + "-" + month + "-" + date + "T00:00:00";
		},
		formatTATPDate: function (value) {
			var currentDate = new Date(value);
			var year = currentDate.getFullYear();
			var date = currentDate.getDate();
			var month = currentDate.getMonth() + 1;
			if (month <= 9) {
				month = "0" + month;
			}
			if (date <= 9) {
				date = "0" + date;
			}
			return "" + year + month + date; //C5267297 #566237 TATP check
		},
		displayErrorTATP: function (tatpStatus) {
			if (tatpStatus === "E") {
				return true;
			}
			return false;
		},
		displayInactiveTATP: function (tatpStatus) {
			if (tatpStatus === "W") {
				return true;
			}
			return false;
		},
		displayAvaiableTATP: function (tatpStatus) {
			if (tatpStatus === "S") {
				return true;
			}
			return false;
		},
		displayTATP: function (type, tatpStatus) {
			if (type === "Fail" && tatpStatus === "E") {
				return true;
			} else if (type === "Warning" && tatpStatus === "W") {
				return true;
			} else if (type === "Success" && tatpStatus === "S") {
				return true;
			} else {
				return false;
			}
		},
		displayTextRequestDate: function (orderType) {
			var value = "";
			if (orderType === "YIO") {
				value = this.getResourceBundle().getText("requestPickupDate");
			} else {
				value = this.getResourceBundle().getText("requestDeliveryDate");
			}
			return value;
		},
		displayRequestDate: function (orderType) {
			if (orderType === "YQT") {
				return false;
			}
			return true;
		},
		displayDeliveryPlant: function (orderType) {
			if (orderType === "YIO") {
				return false;
			}
			return true;
		},
		enableRequestDate: function (orderType) {
			if (orderType === "YIO") {
				return false;
			}
			return true;
		},
		displayQuoteDate: function (orderType) {
			if (orderType === "YQT") {
				return true;
			}
			return false;
		},
		displayRequiredCustomerPO: function (purchaseRequired) {
			if (purchaseRequired === "Y") {
				return true;
			}
			return false;
		},
		displayOrderText: function (orderType) {
			var value;
			if (orderType === "YQT") {
				value = this.getResourceBundle().getText("createQuote");
			} else {
				value = this.getResourceBundle().getText("createOrder");
			}
			return value;
		},
		displayTotalProductValue: function (itemSet) {
			var itemCount = itemSet.length;
			var productValue = 0;
			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var item = itemSet[itemIndex];
				var itemQuantity = item.quantity;
				var itemPrice = item.unitPrice;
				if (itemQuantity && itemPrice) {
					productValue += (itemQuantity * itemPrice);
				}
			}
			var text = this.getResourceBundle().getText("totalProductValue");
			return text + parseFloat(productValue).toFixed(2);
		},
		formatSO: function (salesOrderNo, orderType) {
			if (orderType === "YQT") {
				return "QT " + salesOrderNo;
			} else if (orderType === "YIO") {
				return "IO " + salesOrderNo;
			} else if (orderType === "YOR") {
				return "SO " + salesOrderNo;
			} else if (orderType === "YIR") {
				return "RT " + salesOrderNo;
			} else if (orderType === "YIS") {
				return "WB " + salesOrderNo;
			} else if (orderType === "YRE") {
				return "SR " + salesOrderNo;
			}
		},
		dateFormatting: function (value) {
			if (value) {
				var oDateFormat = DateFormat.getDateTimeInstance({
					pattern: "dd/MM/yyyy"
				});
				return oDateFormat.format(new Date(value));
			} else {
				return value;
			}
		},
		displaySMSText: function (sValue, mobileNo) {
			if (sValue === false && mobileNo !== "") {
				return true;
			}
			return false;
		},
		enableField: function (sValue) {
			if (sValue === "YQT") {
				return false;
			}
			return true;
		},
		displayCurrencyUnit: function (sValue) {
			if (sValue === "AUD") {
				return "$";
			}
			return "";
		},
		formatCurrency: function (currencyType, currencyValue) {
			var currency = "";
			if (currencyType === "AUD") {
				currency = "$ ";
			}
			if (currencyValue) {
				currency = currency + currencyValue;
				return currency;
			}
			return "";
		},
		productImage: function (materialNo) {
			return "https://aeaconnectblobtblprdst.blob.core.windows.net/csr-connect-public/www/product/" + materialNo + "/thumb.jpg";
		},
		formatDiscount: function (discount, discountType, unitOfMeasure) {
			if (discountType === "AUD" && discount) {
				return ["$", discount, unitOfMeasure].join(" ");
			} else if (discount && discountType) {
				return [discount, discountType].join(" ");
			} else {
				return "";
			}
		},
		enablePotentialClubGyprock: function (sValue) {
			if (sValue === "PC") {
				return true;
			}
			return false;
		},
		enableActiveClubGyprock: function (sValue) {
			if (sValue === "AC") {
				return true;
			}
			return false;
		},
		standardOrderItem: function (orderType) {
			if (orderType === "YOR" || orderType === "YOR1") {
				return true;
			}
			return false;
		},
		shippingModeDisplay: function (orderType) {
			if (orderType === "YOR" || orderType === "YOR1" || orderType === "YQT") {
				return true;
			}
			return false;
		},
		tatpStatusDisplay: function (orderType) {
			if (orderType === "YOR" || orderType === "YOR1") {
				return true;
			}
			return false;
		},
		immediateOrderItem: function (orderType) {
			if (orderType === "YIO") {
				return true;
			}
			return false;
		},
		deliveryItem: function (orderType, isDelivery) {
			if ((orderType === "YOR" || orderType === "YOR1" || orderType === "YQT") && isDelivery) {
				return true;
			}
			return false;
		},
		deliveryTypeItem: function (orderType, isDelivery) {
			if ((orderType === "YOR" || orderType === "YOR1") && isDelivery) {
				return true;
			}
			return false;
		},
		timeSlotDisplay: function (orderType) {
			if (orderType === "YOR" || orderType === "YOR1") {
				return true;
			}
			return false;
		},
		truckTypeDisplay: function (orderType, isDelivery) {
			if ((orderType === "YOR" || orderType === "YOR1") && isDelivery) {
				return true;
			}
			return false;
		},
		shippingDisplay: function (orderType) {
			if ((orderType === "YOR" || orderType === "YOR1" || orderType === "YQT")) {
				return true;
			}
			return false;
		},
		displayOrderItem: function (orderType) {
			if (orderType === "YQT") {
				return false;
			}
			return true;
		},
		enable3rdParty: function (orderType) {
			if (orderType === "YOR1") {
				return true;
			}
			return false;
		},
		isItemEligibleForDisplay: function (materialType) {
			if (materialType === "YTAW" || materialType === "YAGW" ||
				materialType === "DIEN" || materialType === "NLAG") {
				return false;
			}
			return true;
		},
		isItemEligibleForEdit: function (materialType) {
			if (materialType === "YTAW" || materialType === "YAGW" ||
				materialType === "DIEN" || materialType === "NLAG") {
				return true;
			}
			return false;
		},
		isPromotionalProduct: function (isPromotion) {
			if (isPromotion) {
				return true;
			}
			return false;
		},
		isThirdPartyProduct: function (isThirdPartyItem) {
			if (isThirdPartyItem) {
				return true;
			}
			return false;
		},
		displayDeliveryItemDetails: function (shippingMode) {
			if (shippingMode === "D") {
				return true;
			}
			return false;
		},
		isCreateQuoteVisible: function (orderType) {
			if (orderType === "YQT") {
				return true;
			}
			return false;
		},
		isPaymentVisible: function (orderType, paymentTerm) {
			if (orderType !== "YQT") {
				if (paymentTerm && paymentTerm === "CASH") {
					return true;
				}
			}
			return false;
		},
		isSaveOrderVisible: function (orderType, paymentTerm) {
			if (orderType !== "YQT") {
				if (paymentTerm && paymentTerm === "CASH") {
					return false;
				} else if (paymentTerm && paymentTerm === "COD") {
					return true;
				} else {
					return true;
				}
			}
			return false;
		},
		displaySaveOrderText: function (payableAmount, orderType) {
			if (payableAmount) {
				var amount = parseFloat(payableAmount);
				if (amount > 0 && orderType !== "YIO") {
					return this.getResourceBundle().getText("saveWithoutFullPayment");
				} else {
					return this.getResourceBundle().getText("save");
				}
			}
			return this.getResourceBundle().getText("saveWithoutFullPayment");
		},
		isMaterialEditable: function (materialDesc, busy) {
			if (materialDesc && !busy) {
				return false;
			}
			return true;
		},
		formatAddToCartText: function (orderType) {
			if (orderType === "YQT") {
				return this.getResourceBundle().getText("copy");
			}
			return this.getResourceBundle().getText("addItemsToCart");
		},
		checkOutText: function (orderType) {
			if (orderType === "YQT") {
				return this.getResourceBundle().getText("quoteCheckOutText");
			}
			return this.getResourceBundle().getText("checkout");
		},
		displayItemText: function (mode, islandscape) {
			var deviceModel = this.getOwnerComponent().getModel("device");
			var isDesktop = deviceModel.getProperty("/system/desktop");
			if (mode === "HideMode") {
				return true;
			} else if (isDesktop) {
				return true;
			} else if (!isDesktop && !islandscape) {
				return true;
			}
			return false;
		},
		displayConfirmedQuantityValue: function (mode, islandscape, confirmedQty) {
			if (confirmedQty === "0" || confirmedQty) {
				return this.formatter.displayItemText.apply(this, [mode, islandscape]);
			}
			return false;
		},
		displayAlertIcon: function (quantity, confirmedQty) {
			if (quantity && (confirmedQty === 0 || confirmedQty)) {
				if (parseInt(confirmedQty, 10) < parseInt(quantity, 10)) {
					return true;
				}
			}
			return false;
		},
		getLocalDate: function (date) {
			var localDate = new Date();
			var day = date.getDate();
			var month = date.getMonth();
			var year = date.getFullYear();
			localDate.setFullYear(year, month, day);
			return localDate;
		},
		getDateInputValueString: function (date) {
			var day = date.getDate();
			if (day < 10) {
				day = "0" + day;
			}
			var month = date.getMonth();
			month = month + 1;
			if (month < 10) {
				month = "0" + month;
			}
			var year = date.getFullYear();
			return day + "/" + month + "/" + year;
		},
		formatCartItemAmount: function (amount) {
			var amountValue = "";
			if (amount) {
				amountValue = parseFloat(amount).toLocaleString(undefined, {
					minimumFractionDigits: 2
				});
			}
			return amountValue;
		},
		formatCartItemQuantity: function (amount, unit) {
			var amountValue = "";
			if (amount) {
				amountValue = parseFloat(amount).toLocaleString();
				amountValue = [amountValue, unit].join(" ");
			}
			return amountValue;
		},
		formatProductStock: function (stockQuantity, stockUnit) {
			var stockQtyValue = "";
			if (stockQuantity) {
				stockQtyValue = parseFloat(stockQuantity).toLocaleString();
				stockQtyValue = [stockQtyValue, stockUnit].join(" ");
			}
			return stockQtyValue;
		},
		formatPOSCurrency: function (amount) {
			var amountValue = "";
			if (amount) {
				amountValue = parseFloat(amount).toLocaleString(undefined, {
					minimumFractionDigits: 2
				});
			}
			return amountValue;
		},
		displayMaster: function (islandscape) {
			var deviceModel = this.getOwnerComponent().getModel("device");
			var isDesktop = deviceModel.getProperty("/system/desktop");
			if (!isDesktop && islandscape) {
				return "HideMode";
			}
			return "StretchCompressMode";
		},
		displaySalesUnitList: function (salesUnitList, discountType, busy) {
			if (busy || (salesUnitList && discountType === "AUD")) {
				return true;
			}
			return false;
		},
		enableCreditBlock: function (sValue) {
			if (sValue === true) {
				return true;
			} else {
				return false;
			}
		},
		formatWeightAndArea: function (value, unit) {
			if (value) {
				value = parseFloat(value).toLocaleString(undefined, {
					minimumFractionDigits: 3
				});
			}
			return [value, unit].join(" ");
		},
		formatAmount: function (amount, unit) {
			var amountValue = "";
			if (amount) {
				amountValue = parseFloat(amount).toLocaleString(undefined, {
					minimumFractionDigits: 2
				});
			}
			return [amountValue, unit].join(" ");
		},
		isItemBusy: function (busy) {
			if (busy) {
				return true;
			}
			return false;
		},
		isQuantityEnabled: function (isQuantityDisable) {
			if (isQuantityDisable) {
				return false;
			}
			return true;
		},
		/**
		 * based on country code and PCI the boolean flag is set to true or false
		 * from: C5265889 - 27th Nov 2020 and 27 Aug 2024
		 * @public
		 * @param {string} sCountryCode is country code
		 * @param {boolean} IsPCIActive is to indicate if SecureCo is enabled
		 * @returns {boolean} bFlag return WRT the country code
		 */
		displayBpointWRTCountryandPCI: function (sCountryCode, IsPCIActive) {
			var bFlag = true;
			if (sCountryCode === "NZ" || IsPCIActive) {
				bFlag = false;
			}
			return bFlag;
		}

	};

});