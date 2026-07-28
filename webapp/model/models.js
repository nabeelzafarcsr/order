sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		createPOSSplitAppModel: function () {
			var oModel = new JSONModel({
				"mode": "StretchCompressMode"
			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createCustomerModel: function () {
			var oModel = new JSONModel({
				"customerID": "",
				"firstName": "",
				"lastName": "",
				"cashCustomer": false

			});
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		createCartItemsModel: function () {
			var oModel = new JSONModel({
				"addButtonEnabled": false,
				"checkoutButtonEnabled": false,
				"totalItemCount": 0,
				"ItemSet": [{

				}]
			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createCartHeaderModel: function () {
			var oModel = new JSONModel({
				"productValue": "0.00",
				"shippingMode": "pickup",
				"printPickList": false,
				"tatpStatus": "",
				"orderType": "YIR",
				"requestedPickupDate": new Date()
			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createCountryModel: function () {
			var oModel = new JSONModel({
				"countryCode": ""
			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createOrderHeaderModel: function () {
			var oModel = new JSONModel({
				"smsSelected": true
			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		creatCatalogueModel: function () {
			var oModel = new JSONModel({
				"isProductListVisible": true,
				"isOrderListVisible": false,
				"searchVal": ""

			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createBPointModel: function () {
			var oModel = new JSONModel({
				"protocol": "https://",
				"host": "bpoint.uat.linkly.com.au", //bpoint-uat.premier.com.au",
				"path": "/webapi/v3/txns/iframe/",
				"authKey": "",
				"liveHost": "www.bpoint.com.au"
			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createServiceCallModel: function () {
			var oModel = new JSONModel();
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		createCustomerCockpitModel: function () {
			var oModel = new JSONModel({
				"receivePaymentOrder": ""
			});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createReceivePaymentOrderModel: function () {
			var oModel = new JSONModel({});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
		createReceivePaymentOrderDetailsModel: function () {
			var oModel = new JSONModel({});
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		}
	};
});