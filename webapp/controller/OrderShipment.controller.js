/*Change History
 ***********************************************************************
 * Date         Incident      Author      Description
 * --------    -----------  ---------    ------------------
 *10/07/18   354443/2018   C5253525    ePOS freeze when creating quotes
 ***********************************************************************
 */
sap.ui.define([
	"com/csr/order/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/ui/model/FilterOperator",
	"com/csr/order/model/formatter",
	"com/csr/order/util/OrderServiceUtil"
], function(BaseController, JSONModel, History, FilterOperator, formatter, OrderServiceUtil) {
	"use strict";

	return BaseController.extend("com.csr.order.controller.OrderShipment", {

		formatter: formatter,
		OrderServiceUtil: OrderServiceUtil,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf com.csr.order.view.OrderShipment
		 */
		onInit: function() {
			var oViewModel = this.createViewModel();
			this.getView().setModel(oViewModel, "orderShipmentViewModel");
			this.oEventBus = this.getEventBus();
			this.getOwnerComponent().getRouter().getRoute("OrderShipment").attachPatternMatched(this.onObjectMatched, this);
		},
		createViewModel: function() {
			return new JSONModel({
				"delay": 0,
				"busy": false,
				"isFreightRecalculation": false,
				"isPaymentEnable": true,
				"mobileNoValueState": "None"
				
			});
		},
		onObjectMatched: function () {
			this.triggerSuburb("");
		},
		onItemPress : function(oEvent) {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/busy", true);
			var itemContextPath = oEvent.getParameter("listItem").getBindingContextPath();
			var itemIndex = itemContextPath.substring(itemContextPath.lastIndexOf("/") + 1, itemContextPath.length);
			var oParameter = {
				"itemIndex": itemIndex,
				"context": "orderShipment"
			};
			this.getOwnerComponent().getRouter().navTo("OrderScheduleLines",oParameter, true);
			oViewModel.setProperty("/busy", false);
		},
		onSubrubValueHelpRequest: function() {
			if (!this.subrub) {
				this.subrub = sap.ui.xmlfragment("shipmentSubrubSelection","com.csr.order.view.fragment.Subrub", this);
				this.getView().addDependent(this.subrub);
			}
			this.subrub.open();	
		},
		closeSubrubPressed: function () {
		},
		onSubrubChange: function (oEvent) {
			var subrubValue = oEvent.getParameter("value");
			this.clearRegionValues();
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/isPaymentEnable", false);
			this.validateSuburb();
			if (subrubValue) {
				this.fetchSuburbDetails(subrubValue);
			} else {
				oViewModel.setProperty("/subrubShowValueStateMessage", true);
				oViewModel.setProperty("/subrubValueState", "Error");
			}
			
		},
		fetchSuburbDetails: function (suburbVal) {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			
			var suburbValues = oViewModel.getProperty("/suburbValues");
			var suburbCount = suburbValues.length;
			var suburbFound = false;
			for (var suburbIndex = 0; suburbIndex < suburbCount ; suburbIndex++) {
				var suburb = suburbValues[suburbIndex];
				if (suburb.City1 === suburbVal) {
					suburbFound = true;
					this.updateSubrubValues(suburb);
					break;
				}
			}
			if (!suburbFound) {
				oViewModel.setProperty("/subrubShowValueStateMessage", true);
				oViewModel.setProperty("/subrubValueState", "Error");
			} else {
				oViewModel.setProperty("/subrubShowValueStateMessage", false);
				oViewModel.setProperty("/subrubValueState", "None");
			}
		},
		
		
		onSubrubSubmit: function (oEvent) {
			//var subrubVal = oEvent.getParameter("value");
			//this.triggerSuburb(subrubVal);
		},
		triggerSuburb: function (subrubVal) {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var oThis = this;
			var oFilters = [];
			if (subrubVal) {
				var subrubFilter = new sap.ui.model.Filter("City1", FilterOperator.EQ, subrubVal);
				oFilters.push(subrubFilter);
			}
			var oModel = this.getModel();
			oViewModel.setProperty("/busy", true);
			oModel.read("/GetSuburbSet", 
				{
					filters: oFilters,
					success: function (data) {
						oThis.onGetSubrubSuccessCallback(data);
					}, 
					error: function () {
						oThis.onGetSubrubErrorCallback();
					}
				});
		},
		onGetSubrubSuccessCallback: function(data) {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			if (data && data.results && data.results.length > 0) {
				
				if (data.results.length > 0) {
					oViewModel.setSizeLimit(data.results.length);
					oViewModel.setProperty("/suburbValues", data.results);
				} else {
					this.updateSubrubValues(data.results[0]);
				}
				oViewModel.setProperty("/isPaymentEnable", true);
				oViewModel.setProperty("/busy", false);
			} else {
				oViewModel.setProperty("/isFreightRecalculation", false);
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("unableToFetchSubrub"),
					{
						duration: 6000
					});
			}
		},
		onGetSubrubErrorCallback: function() {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/busy", false);
			oViewModel.setProperty("/isFreightRecalculation", false);
			sap.m.MessageToast.show(
				this.getResourceBundle().getText("unableToFetchSubrub"),
				{
					duration: 6000
				});
		},
		onSubrubSelect: function (oEvent) {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var oSubrubPath = oEvent.getParameter("selectedContexts")[0].sPath;
			var oSubrub = this.getModel().getProperty(oSubrubPath);
			oViewModel.setProperty("/subrubShowValueStateMessage", false);
			oViewModel.setProperty("/subrubValueState", "None");
			this.updateSubrubValues(oSubrub);
		},
		updateSubrubValues : function(data) {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var shippingMode = 	orderHeaderModel.getProperty("/shippingMode");
			orderHeaderModel.setProperty("/subrub", data.City1);
			orderHeaderModel.setProperty("/state", data.Region);
			orderHeaderModel.setProperty("/postalCode", data.PostCode1);
			if (shippingMode === "D") {
				this.enableFreightRecalcuation();
			} else {
				oViewModel.setProperty("/isPaymentEnable", true);
			}	
		},
		onSubrubSearch : function (oEvent) {
			var searchVal = oEvent.getParameter("value");
			var searchFilter = new sap.ui.model.Filter("City1", FilterOperator.EQ, searchVal);
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([searchFilter]);
		},
		clearRegionValues: function () {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/isFreightRecalculation", false);
			orderHeaderModel.setProperty("/state", "");
			orderHeaderModel.setProperty("/postalCode", "");
		},
		enableFreightRecalcuation: function () {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/isFreightRecalculation", true);
		},
		
		handleCreateQuote: function() {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
		//	C5267297 Mandatory fileds CR enhancements Contact person and Mobile number
			var orderType = this.getOwnerComponent().getModel("cartHeaderModel").getProperty("/orderType");
			if(orderType === "YQT"){
				this.validateContactPerson();
				this.validateMobileNumber();
			}
			var isMobileNoValid = oViewModel.getProperty("/mobileNoShowValueStateMessage");
			var isShipToValid = oViewModel.getProperty("/shipToShowValueStateMessage");
			var isSuburbValid = oViewModel.getProperty("/subrubShowValueStateMessage");
			var isStreetValid = oViewModel.getProperty("/streetShowValueStateMessage");
			var isCartEmpty = this.isCartEmpty();
			var isContactPerValid = oViewModel.getProperty("/contactPerShowValueStateMessage");
			
			if (isCartEmpty) {
				sap.m.MessageToast.show(
				this.getResourceBundle().getText("addItems"), {
					duration: 6000
				});
			} else if ((isMobileNoValid !== undefined && isMobileNoValid) || (isShipToValid !== undefined && isShipToValid) ||
				(isSuburbValid !== undefined && isSuburbValid) || (isStreetValid !== undefined && isStreetValid) || (orderType === "YQT" && isContactPerValid !== undefined && isContactPerValid)) {
			
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("mandatoryFieldsCheck"),
					{
						duration: 6000
					});
					
			} else {
				oViewModel.setProperty("/busy", true);
				this.triggerCreateOrderService();
			}
			
		},
		onMobileNoChange: function() {
			this.validateMobileNumber();
		},
		onMobileNumberLiveChange: function(oEvent) {
			var mobileNo = oEvent.getSource();
			mobileNo.setValue(mobileNo.getValue().replace(/[^0-9]/g, ""));
			this.validateMobileNumber();
		},
		onReset: function () {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			orderHeaderModel.setProperty("/streetAddress", "");
			orderHeaderModel.setProperty("/postalCode", "");
			orderHeaderModel.setProperty("/subrub", "");
			orderHeaderModel.setProperty("/contactPerson", "");
			orderHeaderModel.setProperty("/mobileNumber", "");
			oViewModel.setProperty("/streetShowValueStateMessage", true);
			oViewModel.setProperty("/streetValueState", "Error");
			oViewModel.setProperty("/subrubShowValueStateMessage", true);
			oViewModel.setProperty("/subrubValueState", "Error");
			oViewModel.setProperty("/isFreightRecalculation", false);
		},
		OnFreightRecalculate: function () {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/busy", true);
			this.triggerCreateOrderService(true);
		},
		
		validateMobileNumber: function() {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var mobileNo = orderHeaderModel.getProperty("/mobileNumber");
			var countryCode = orderHeaderModel.getProperty("/countryCode");             							//	C5267297 597574 - MobileNo validation(starting with 04 for AU)
			var regex = /(04)\d{8}$/;
			var orderType = this.getOwnerComponent().getModel("cartHeaderModel").getProperty("/orderType");        //	C5267297 Mandatory fileds CR enhancements for Order YQT
			if (orderType !== "YQT" && (mobileNo.length === 10 || mobileNo.length === 0)) { 
			    if(countryCode === "AU" && mobileNo && mobileNo.length === 10 && !mobileNo.match(regex)){
			    	oViewModel.setProperty("/mobileNoShowValueStateMessage", true);
					oViewModel.setProperty("/mobileNoValueState", "Error");
					return false;
			    } else{                          
					oViewModel.setProperty("/mobileNoShowValueStateMessage", false);
					oViewModel.setProperty("/mobileNoValueState", "None");
					return true;
			    }
			}else if(orderType === "YQT" && mobileNo && mobileNo.length === 10){
				 if(countryCode === "AU" && mobileNo && mobileNo.length === 10 && !mobileNo.match(regex)){
			    	oViewModel.setProperty("/mobileNoShowValueStateMessage", true);
					oViewModel.setProperty("/mobileNoValueState", "Error");
					return false;
			    } else{
					oViewModel.setProperty("/mobileNoShowValueStateMessage", false);
					oViewModel.setProperty("/mobileNoValueState", "None");
					return true;
			    }
			}else{
				oViewModel.setProperty("/mobileNoShowValueStateMessage", true);
				oViewModel.setProperty("/mobileNoValueState", "Error");
				return false;
			}
		},
		
		onShipToChange: function() {
			this.validateShipTo();
		},
		onStreetChange: function () {
			this.validateStreet();	
		},
		
		//	C5267297 Mandatory fileds CR enhancements Contact person and Mobile number
		onContactPerChange: function(){
			var orderType = this.getOwnerComponent().getModel("cartHeaderModel").getProperty("/orderType");
			if(orderType === "YQT"){
				this.validateContactPerson();
			}
		},
		
		validateShipTo: function() {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var shipTo = orderHeaderModel.getProperty("/shipToName");
			if (shipTo) {
				oViewModel.setProperty("/shipToShowValueStateMessage", false);
				oViewModel.setProperty("/shipToValueState", "None");
				return true;
			}
			oViewModel.setProperty("/shipToShowValueStateMessage", true);
			oViewModel.setProperty("/shipToValueState", "Error");
			return false;
		},
		validateStreet: function () {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var street = orderHeaderModel.getProperty("/streetAddress");
			if (street) {
				oViewModel.setProperty("/streetShowValueStateMessage", false);
				oViewModel.setProperty("/streetValueState", "None");
				return true;
			}
			oViewModel.setProperty("/streetShowValueStateMessage", true);
			oViewModel.setProperty("/streetValueState", "Error");
			return false;
		},
		
		//	C5267297 Mandatory fileds CR enhancements Contact person and Mobile number
		validateContactPerson:function () {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var contactPerson = orderHeaderModel.getProperty("/contactPerson");
			if (contactPerson && contactPerson.trim()) {
				oViewModel.setProperty("/contactPerShowValueStateMessage", false);
				oViewModel.setProperty("/contactPerValueState", "None");
				return true;
			}
			oViewModel.setProperty("/contactPerShowValueStateMessage", true);
			oViewModel.setProperty("/contactPerValueState", "Error");
			return false;
		},
		
		validateSuburb: function () {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var suburb = orderHeaderModel.getProperty("/subrub");
			var state = orderHeaderModel.getProperty("/state");
			var postalCode = orderHeaderModel.getProperty("/postalCode");
			if (suburb && state && postalCode) {
				oViewModel.setProperty("/subrubShowValueStateMessage", false);
				oViewModel.setProperty("/subrubValueState", "None");
				return true;
			}
			oViewModel.setProperty("/subrubShowValueStateMessage", true);
			oViewModel.setProperty("/subrubValueState", "Error");
			return false;
		},
		onSMSSelect: function(oEvent) {
			var smsCheckboxSelected = oEvent.getParameter("selected");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			orderHeaderModel.setProperty("/smsSelected", smsCheckboxSelected);
		},
		triggerCreateOrderService: function(isSubrubChanges) {
			var oThis = this;
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var createOrderRequest = OrderServiceUtil.getHeaderForCreateOrder.apply(this);
			var salesOrderTypeCode = orderHeaderModel.getProperty("/orderTypeCode");
			
			if (isSubrubChanges) {
				createOrderRequest.Simul = "X";
				createOrderRequest.IsSurbChg = "X";
			} else if (salesOrderTypeCode !== "YQT1") { //Added by C5253525#354443-ePOS freeze when creating quotes
				createOrderRequest.Zzpaidfull = "X";
			}
			
			var noteSet = OrderServiceUtil.getHeaderTextForCreateOrder.apply(this);
			createOrderRequest.HeaderTextSet = noteSet;
			var vbelnRef = orderHeaderModel.getProperty("/VbelnRef");
			if (vbelnRef) {
				createOrderRequest.VbelnRef = vbelnRef;
			}
			
			var HeaderPartnerSet = [];
			var partner = OrderServiceUtil.getHeaderPartnerForRequest.apply(this);                   
			HeaderPartnerSet.push(partner);
			
			if (salesOrderTypeCode !== "YIO" && salesOrderTypeCode !== "YQT1") {//Added by C5253525#354443-ePOS freeze when creating quotes
				var requestedDeliveryDate = orderHeaderModel.getProperty("/requestedDeliveryDate");
				createOrderRequest.RequestedDeliveryDate = this.formatter.formatDate(requestedDeliveryDate);
				
			}  else if (salesOrderTypeCode === "YQT1") {//Added by C5253525#354443-ePOS freeze when creating quotes
				var validTo = orderHeaderModel.getProperty("/quoteEndDate");
				
				if (validTo) {
					createOrderRequest.Bnddt = this.formatter.formatDate(validTo);
				}
				
				createOrderRequest.Angdt = this.formatter.formatDate(new Date());
				var peParnterCustomerID = orderHeaderModel.getProperty("/pePartnerCustomerID");
				var bmPartner = orderHeaderModel.getProperty("/bmPartner");
				bmPartner.CustomerID = peParnterCustomerID;     
				HeaderPartnerSet.push(bmPartner);
			}
			
			createOrderRequest.HeaderPartnerSet = HeaderPartnerSet;
			var itemSet = OrderServiceUtil.getItemSetForRequest.apply(this);  
			createOrderRequest.ItemSet = itemSet;
			
			var oModel = this.getModel();
				oModel.setUseBatch(false);
				oModel.create("/HeaderSet", createOrderRequest,
					{
						success: function (data) {
							oThis.onOrderCreateSuccessCallback(data, isSubrubChanges);
						},
						error: function (error) {
							oThis.onOrderCreateErrorCallback(error);
						}
					}
				);
		},
		onOrderCreateSuccessCallback: function(data, isSubrubChanges) {
			var oModel = this.getModel();
			oModel.setUseBatch(true);
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			if (!isSubrubChanges) {
				var salesOrderID = data.SalesOrderID;
				var salesOrderTypeCode = data.SalesOrderTypeCode;
				var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
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
				cartItemsModel.setProperty("/ItemSet",itemSet);
				cartItemsModel.setProperty("/totalItemCount",0);
				cartItemsModel.setProperty("/addButtonEnabled", false);
				cartItemsModel.setProperty("/checkoutButtonEnabled", false);
				
				// Clear Order Header Values
				OrderServiceUtil.clearValuesInModel.apply(this);                     
				this.oEventBus.publish("OrderShipment", "refreshProductList", {});
				this.oEventBus.publish("OrderShipment", "refreshShipToValues", {});
			
				if (salesOrderTypeCode === "YQT1") {//Added by C5253525#354443-ePOS freeze when creating quotes
					orderMsg = this.getResourceBundle().getText("quoteCreated",[salesOrderID, errorMsg]);
				} else if (salesOrderTypeCode === "YIO") {
					orderMsg = this.getResourceBundle().getText("immediateOrderCreated",[salesOrderID, errorMsg]);
				} else if (salesOrderTypeCode === "YOR") {
					orderMsg = this.getResourceBundle().getText("standardOrderCreated",[salesOrderID, errorMsg]);
				} else if (salesOrderTypeCode === "YOR1") {
					orderMsg = this.getResourceBundle().getText("thirdPartyOrderCreated",[salesOrderID, errorMsg]);
				} else {
					orderMsg = this.getResourceBundle().getText("salesOrderCreated",[salesOrderID, errorMsg]);
				}
			
				sap.m.MessageToast.show(
					orderMsg,
					{
						duration: 6000
					});
				this.getOwnerComponent().getRouter().navTo("Home", null, true);
			} else {
				orderHeaderModel.setProperty("/netAmount", data.NetAmount);
				orderHeaderModel.setProperty("/freightCharges", data.FreightChgs);
				orderHeaderModel.setProperty("/taxAmount", data.TaxAmount);
				orderHeaderModel.setProperty("/totalAmount", data.TotalAmount);
				oViewModel.setProperty("/isFreightRecalculation", false);
				oViewModel.setProperty("/isPaymentEnable", true);
				
			}
			oViewModel.setProperty("/busy", false);
		},
		onOrderCreateErrorCallback: function(error) {
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/busy", false);
			var errorResponse = JSON.parse(error.responseText);
			var errorMessage = errorResponse.error.message.value;
			sap.m.MessageToast.show(
				errorMessage,
				{
					duration: 6000
				});
		},
		onNavBack: function() {
			this.handleCancel();
		},
		handleCancel: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var itemSet = cartItemsModel.getProperty("/ItemSet");
			var itemCount = itemSet.length;
			var requestedDeliveryDateValue = new Date();
			var cartItem = {};
			if (requestedDeliveryDateValue) {
				cartItem.deliveryDate = requestedDeliveryDateValue;
			} else {
				cartItem.deliveryDate = new Date();
			}
			cartItemsModel.setProperty("/ItemSet/" + itemCount,cartItem);
		//	this.clearViewModel();
		//	var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
		//	oRouter.navTo("Home", null, true);
			this.getOwnerComponent().getRouter().navTo("Home", null, true);		   //C5267297 - 254149 09/05/2019
		},
		handlePayment: function () {
			//	C5267297 Mandatory fileds CR enhancements Contact person and Mobile number
			var orderType = this.getOwnerComponent().getModel("cartHeaderModel").getProperty("/orderType");
			if(orderType === "YQT"){
				this.validateContactPerson();
				this.validateMobileNumber();
			}
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			var isFreightCalRequired = oViewModel.getProperty("/isFreightRecalculation");
			var isMobileNoValid = oViewModel.getProperty("/mobileNoShowValueStateMessage");
			var isShipToValid = oViewModel.getProperty("/shipToShowValueStateMessage");
			var isSuburbValid = oViewModel.getProperty("/subrubShowValueStateMessage");
			var isStreetValid = oViewModel.getProperty("/streetShowValueStateMessage");
			var isCartEmpty = this.isCartEmpty();
			var isContactPerValid = oViewModel.getProperty("/contactPerShowValueStateMessage");
			
			if (isCartEmpty) {
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
				this.getResourceBundle().getText("addItems"), {
					duration: 6000
				});
			} else if ((isMobileNoValid !== undefined && isMobileNoValid) || (isShipToValid !== undefined && isShipToValid) ||
				(isSuburbValid !== undefined && isSuburbValid) || (isStreetValid !== undefined && isStreetValid) || (orderType === "YQT" && isContactPerValid !== undefined && isContactPerValid)) {
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("mandatoryFieldsCheck"),
					{
						duration: 6000
					});
			} else if (isFreightCalRequired) {
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("performFreightCal"),
					{
						duration: 6000
					});
			} else {
				this.getOwnerComponent().getRouter().navTo("Payment", null, true);
			}
		},
		onStateChange: function() {
			this.updateSubrub();
		},
		onPostalCodeChange: function() {
			this.updateSubrub();
		},
		updateSubrub: function() {
			var orderHeaderModel = this.getOwnerComponent().getModel("orderHeaderModel");
			var postalCode = orderHeaderModel.getProperty("/postalCode");
			var state = orderHeaderModel.getProperty("/state");
			var oFilters = null;
			var customerFilter = new sap.ui.model.Filter("EntityType", FilterOperator.EQ, "Customer");
			var subrubFilter = new sap.ui.model.Filter("PropertyName", FilterOperator.EQ, "Suburb");
			
			if (postalCode && state) {
				var searchText = "AU" + ";" + state + ";" + postalCode;
				var searchTextFilter = new sap.ui.model.Filter("Searchtext", FilterOperator.EQ, searchText);
				oFilters = new sap.ui.model.Filter([customerFilter, subrubFilter, searchTextFilter], true);
			} else {
				oFilters = new sap.ui.model.Filter([customerFilter, subrubFilter], true);
			}
			
			var oSubrubList = this.getView().byId("subrub");

			var template = new sap.ui.core.ListItem({
				key: "{Key}",
				text: "{Value}"
			});
			oSubrubList.bindItems({
				path: "/GetGenericF4Set",
				template: template,
				filters: oFilters
			});
		},
		clearViewModel: function () {
			var oViewModel = this.createViewModel();
			this.getView().setModel(oViewModel, "orderShipmentViewModel");
		},
		handleSaveOrder: function () {
			//	C5267297 Mandatory fileds CR enhancements Contact person and Mobile number
			var orderType = this.getOwnerComponent().getModel("cartHeaderModel").getProperty("/orderType");
			if(orderType === "YQT"){
				this.validateContactPerson();
				this.validateMobileNumber();
			}
			var oViewModel = this.getView().getModel("orderShipmentViewModel");
			oViewModel.setProperty("/busy", true);
			var isMobileNoValid = oViewModel.getProperty("/mobileNoShowValueStateMessage");
			var isShipToValid = oViewModel.getProperty("/shipToShowValueStateMessage");
			var isSuburbValid = oViewModel.getProperty("/subrubShowValueStateMessage");
			var isStreetValid = oViewModel.getProperty("/streetShowValueStateMessage");
			var isContactPerValid = oViewModel.getProperty("/contactPerShowValueStateMessage");
			var isCartEmpty = this.isCartEmpty();
			
			if (isCartEmpty) {
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
				this.getResourceBundle().getText("addItems"), {
					duration: 6000
				});
			} else if ((isMobileNoValid !== undefined && isMobileNoValid) || (isShipToValid !== undefined && isShipToValid) ||
				(isSuburbValid !== undefined && isSuburbValid) || (isStreetValid !== undefined && isStreetValid) || (orderType === "YQT" && isContactPerValid !== undefined && isContactPerValid)) {
			
				oViewModel.setProperty("/busy", false);
				sap.m.MessageToast.show(
					this.getResourceBundle().getText("mandatoryFieldsCheck"),
					{
						duration: 6000
					});
			} else {
				this.triggerCreateOrderService();
			}
		},
		isCartEmpty: function() {
			var cartItemsModel = this.getOwnerComponent().getModel("cartItemsModel");
			var itemSet = cartItemsModel.getProperty("/ItemSet");
			var itemCount = itemSet.length;
			for (var itemIndex = 0; itemIndex < itemCount; itemIndex++) {
				var item = itemSet[itemIndex];
				if (item.materialDesc) {
					return false;
				}
			}
			return true;
		},
		onAfterRendering: function () {
			/*var OThis = this;
			var suburbVal;
			jQuery.sap.delayedCall(0, this, function() {
				$("input[id*=suburb]").keydown(function(e) {
					if (e.keyCode === jQuery.sap.KeyCodes.TAB) {
						suburbVal = OThis.getView().byId("suburb").getValue();
						OThis.triggerSuburb(suburbVal);
					}
				});
			});*/
		}
	});

});