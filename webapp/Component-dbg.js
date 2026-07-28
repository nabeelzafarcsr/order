sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/csr/order/model/models"
], function (UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("com.csr.order.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			var oThis = this;
			this.eventBusDetails = [];
			this.setModel(models.createDeviceModel(), "device");
			this.setModel(models.createPOSSplitAppModel(), "posSplitApp");
			this.setModel(models.createCustomerModel(), "customerModel");
			this.setModel(models.createCartItemsModel(), "cartItemsModel");
			this.setModel(models.createCartHeaderModel(), "cartHeaderModel");
			this.setModel(models.createOrderHeaderModel(), "orderHeaderModel");
			this.setModel(models.creatCatalogueModel(), "catalogueModel");
			this.setModel(models.createServiceCallModel(), "serviceCallModel");
			this.setModel(models.createCountryModel(), "countryModel");
			this.setModel(models.createBPointModel(), "bpointModel");
			this.setModel(models.createCustomerCockpitModel(), "customerCockpitModel");
			this.setModel(models.createReceivePaymentOrderModel(), "receivePaymentOrderModel");
			this.setModel(models.createReceivePaymentOrderDetailsModel(), "receivePaymentOrderDetailsModel");

			var oModel = new sap.ui.model.odata.v2.ODataModel({
				serviceUrl: "sap/opu/odata/sap/ZPOSITIVE_UTILITY_SRV_SRV"
			});
			var oAuthKeyModel = new sap.ui.model.odata.v2.ODataModel({
				serviceUrl: "sap/opu/odata/sap/ZPOSITIVE_BPOINT_SRV_SRV"
			});
			this.setModel(oAuthKeyModel, "authKey");
			/*var orderODataModel = this.getModel();
			
			orderODataModel.attachRequestSent(function(){
				oThis.onRequestSent();
			});
			orderODataModel.attachRequestFailed(function(){
				oThis.onRequestFailed();
			});
			orderODataModel.attachRequestCompleted(function(){
					oThis.onRequestCompleted();
			});*/

			oModel.read("/UserParameterSet('LOGGEDUSER')", {
				success: function (data) {
					oThis.onGetStoreDetailsSuccessCallback(data);
				},
				error: function () {
					oThis.onGetStoreDetailsErrorCallback();
				}
			});
			
			UIComponent.prototype.init.apply(this, arguments);
			this.getRouter().initialize();
			//Start of changes by C5253525-dynatrace-API implementation			
			this.loadDynaTraceApi();
			//End of changes by C5253525-dynatrace-API implementation
			
			// if (true/*this.getComponentData() && this.getComponentData().startupParameters.receivePaymentOrder && 
			// 	this.getComponentData().startupParameters.receivePaymentOrder[0]*/) {
					
			// 	// this.getModel("customerCockpitModel").setProperty("/receivePaymentOrder", this.getComponentData().startupParameters.receivePaymentOrder[
			// 	// 0]);
			// 	this.getRouter().navTo("Payment", null, true);
			// }
			
			if (this.getComponentData() && this.getComponentData().startupParameters.receivePaymentOrder && 
				this.getComponentData().startupParameters.receivePaymentOrder[0]) {
					
				this.getModel("customerCockpitModel").setProperty("/receivePaymentOrder", this.getComponentData().startupParameters.receivePaymentOrder[
				0]);
				this.getRouter().navTo("Payment", null, true);
			}	
			
		},
		eventBusReset: function () {
			for (var eIndex = 0; eIndex < this.eventBusDetails.length; eIndex++) {
				sap.ui.getCore().getEventBus().unsubscribe(
					this.eventBusDetails[eIndex].channel,
					this.eventBusDetails[eIndex].event,
					this.eventBusDetails[eIndex].func,
					this.eventBusDetails[eIndex].listner
				);
			}

			this.eventBusDetails = [];
		},
		eventBusRegister: function (rChannel, rEvent, rFunction, rListner) {

			sap.ui.getCore().getEventBus().subscribe(rChannel, rEvent, rFunction, rListner);
			this.eventBusDetails.push({
				channel: rChannel,
				event: rEvent,
				func: rFunction,
				listner: rListner
			});
		},
		onGetStoreDetailsSuccessCallback: function (data) {
			//debugger;
			var oCustomerModel = this.getModel("customerModel");
			oCustomerModel.setProperty("/customerID", data.ReferenceCustomer);
			//oCustomerModel.setProperty("/firstName", data.RefCustomerDesc);
			//oCustomerModel.setProperty("/lastName", "");
			oCustomerModel.setProperty("/cashCustomer", false);
			oCustomerModel.setProperty("/salesOrg", data.SalesOrg);
			oCustomerModel.setProperty("/distChannel", data.DistChannel);
			oCustomerModel.setProperty("/division", data.Division);
			oCustomerModel.setProperty("/referenceCustomer", data.ReferenceCustomer);
			oCustomerModel.setProperty("/storeId", data.StoreId);
			oCustomerModel.setProperty("/paymentTerm", data.PaymentTermsCode);
			oCustomerModel.setProperty("/purchaseOrderRequired", data.Katr1);
			//PCI Complaince Changes starts
			oCustomerModel.setProperty("/IsPCIActive", data.IsPCIActive === true || data.IsPCIActive === "true");
			//oCustomerModel.setProperty("/IsPCIActive", false);
			oCustomerModel.setProperty("/IsCreditCardFeeActive", data.IsCreditCardFeeActive === true || data.IsCreditCardFeeActive === "true");
			oCustomerModel.setProperty("/CCExpiryValidation", data.CCExpiryValidation === true || data.CCExpiryValidation === "true");
			oCustomerModel.setProperty("/SecurecoMerchantId", data.SecurecoMerchantId);
			oCustomerModel.setProperty("/IsAMEXAllowed", data.IsAMEXAllowed === true || data.IsAMEXAllowed === "true");
			//PCI Complaince Changes ends

			var cartHeaderModel = this.getModel("cartHeaderModel");
			cartHeaderModel.setProperty("/deliveryPlant", data.StoreId);
			cartHeaderModel.setProperty("/previousSelectedDeliveryPlant", data.StoreId);

			//cartHeaderModel.setProperty("/firstName", data.RefCustomerDesc);
			//cartHeaderModel.setProperty("/businessName", data.RefCustomerDesc);
			//cartHeaderModel.setProperty("/lastName", "");
			//cartHeaderModel.setProperty("/customerPaymentTerm", data.PaymentTermsCode);
			cartHeaderModel.setProperty("/purchaseOrderRequired", data.Katr1);
			this.triggerGetStoreCustomer(data.ReferenceCustomer);
		},
		onGetStoreDetailsErrorCallback: function () {

		},
		triggerGetStoreCustomer: function (customerID) {
			var oThis = this;
			var orderOdataModel = this.getModel();
			orderOdataModel.read("/CustomerHeaderSet('" + customerID + "')", {
				success: function (data) {
					oThis.onGetStoreCustomerSuccessCallback(data);
				},
				error: function () {
					oThis.onGetStoreCustomerErrorCallback();
				}
			});

		},
		onGetStoreCustomerSuccessCallback: function (data) {
			var cartHeaderModel = this.getModel("cartHeaderModel");
			var oCustomerModel = this.getModel("customerModel");
			oCustomerModel.setProperty("/firstName", data.Firstname);
			oCustomerModel.setProperty("/lastName", data.Lastname);
			oCustomerModel.setProperty("/customerPaymentTerm", data.PaymentTermCode);
			oCustomerModel.setProperty("/customerClubGyprock", data.ZzclubGyprock);
			oCustomerModel.setProperty("/customerBilling", data.Billingblockcode);
			oCustomerModel.setProperty("/customerDelivery", data.Deliveryblockcode);
			oCustomerModel.setProperty("/customerNotes", data.Notes);
			oCustomerModel.setProperty("/businessName", data.Businessname);
			oCustomerModel.setProperty("/email", data.SmtpAddr);

			cartHeaderModel.setProperty("/customerID", data.CustomerId);
			cartHeaderModel.setProperty("/firstName", data.Firstname);
			cartHeaderModel.setProperty("/lastName", data.Lastname);
			cartHeaderModel.setProperty("/businessName", data.Businessname);
			cartHeaderModel.setProperty("/customerPaymentTerm", data.PaymentTermCode);
			cartHeaderModel.setProperty("/customerClubGyprock", data.ZzclubGyprock);
			cartHeaderModel.setProperty("/customerBilling", data.Billingblockcode);
			cartHeaderModel.setProperty("/customerDelivery", data.Deliveryblockcode);
			cartHeaderModel.setProperty("/customerNotes", data.Notes);
			cartHeaderModel.setProperty("/email", data.SmtpAddr);
			this.oEventBus = sap.ui.getCore().getEventBus();
			this.oEventBus.publish("component", "refreshProductList", {});
			this.oEventBus.publish("component", "refreshShipToValues", {});

		},
		onGetStoreCustomerErrorCallback: function () {

		},
		destroy: function () {
			this.eventBusReset();
			this.getModel().destroy();
			this.getModel("i18n").destroy();
			this.getModel("device").destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},
		onRequestSent: function () {
			var callCounts = this.getModel("serviceCallModel").getProperty("/callCounts");
			if (!callCounts) {
				callCounts = 1;
			} else {
				callCounts += 1;
			}
			this.getModel("serviceCallModel").setProperty("/callCounts", callCounts);
			this.getModel("serviceCallModel").setProperty("/busySetupDialog", true);
		},
		onRequestFailed: function () {
			var callCounts = this.getModel("serviceCallModel").getProperty("/callCounts");
			if (!callCounts) {
				callCounts = 0;
			} else {
				callCounts -= 1;
			}
			if (callCounts === 0) {
				this.getModel("serviceCallModel").setProperty("/busySetupDialog", false);
			}
			this.getModel("serviceCallModel").setProperty("/callCounts", callCounts);

		},
		onRequestCompleted: function (event) {
			var callCounts = this.getModel("serviceCallModel").getProperty("/callCounts");
			if (!callCounts) {
				callCounts = 0;
			} else {
				callCounts -= 1;
			}
			if (callCounts === 0) {
				this.getModel("serviceCallModel").setProperty("/busySetupDialog", false);
				//this.oEventBus = sap.ui.getCore().getEventBus();
				//this.oEventBus.publish('masterChannel', "allServicesCompleted", {});
			}
			this.getModel("serviceCallModel").setProperty("/callCounts", callCounts);
		},
		//Start of changes by C5253525-dynatrace-API implementation
		loadDynaTraceApi: function () {
				//Start of changes by I561959 - Fix for UI upgrade
				var componentData = this.getComponentData && this.getComponentData();
				var params = componentData && componentData.startupParameters;
				var dynaTraceURL = params && params.dynaTraceURL && params.dynaTraceURL[0];
				if (dynaTraceURL) {
					//End of changes by I561959 - Fix for UI upgrade
					//var sHost = "qtc56166.live.dynatrace.com";
					var msg = $.ajax({
						type: "GET",
						url: dynaTraceURL, //"https://" + sHost + "/api/v1/rum/jsTag/APPLICATION-6DB6D4D1582D53F5?Api-Token=JwoP8TmlToyfvHSjOs11k",
						async: false
					}).responseText;
					$("head").append(msg);
				}
			}
			//End of changes by C5253525-dynatrace-API implementation
	});
});