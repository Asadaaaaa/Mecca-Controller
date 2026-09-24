import {
  AuthRoute,
  CustomerRoute,
  WarehouseRoute,
  RoleRoute,
  UserRoute,
  ProductCategoryRoute,
  UnitRoute,
  TaxRoute,
  ProductRoute,
  InventoryRoute,
  QuotationRoute,
  SalesOrderRoute,
  DeliveryRoute,
  InvoiceRoute,
  PaymentRoute
} from '#routesPrimaryV1';

class PrimaryHandlerV1 {
  constructor(server) {
    const endpointPrefix = '/primary/v1';

    new AuthRoute(server, endpointPrefix);
    new CustomerRoute(server, endpointPrefix);
    new WarehouseRoute(server, endpointPrefix);
    new RoleRoute(server, endpointPrefix);
    new UserRoute(server, endpointPrefix);
    new ProductCategoryRoute(server, endpointPrefix);
    new UnitRoute(server, endpointPrefix);
    new TaxRoute(server, endpointPrefix);
    new ProductRoute(server, endpointPrefix);
    new InventoryRoute(server, endpointPrefix);
    new QuotationRoute(server, endpointPrefix);
    new SalesOrderRoute(server, endpointPrefix);
    new DeliveryRoute(server, endpointPrefix);
    new InvoiceRoute(server, endpointPrefix);
    new PaymentRoute(server, endpointPrefix);
  }
}

export default PrimaryHandlerV1;