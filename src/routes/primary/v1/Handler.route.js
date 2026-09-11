import { AuthRoute, CustomerRoute, WarehouseRoute, RoleRoute, UserRoute } from '#routesPrimaryV1';

class PrimaryHandlerV1 {
  constructor(server) {
    const endpointPrefix = '/primary/v1';

    new AuthRoute(server, endpointPrefix);
    new CustomerRoute(server, endpointPrefix);
    new WarehouseRoute(server, endpointPrefix);
    new RoleRoute(server, endpointPrefix);
    new UserRoute(server, endpointPrefix);
  }
}

export default PrimaryHandlerV1;