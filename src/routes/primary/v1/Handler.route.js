import { AuthRoute, CustomerRoute } from '#routesPrimaryV1';

class PrimaryHandlerV1 {
  constructor(server) {
    const endpointPrefix = '/primary/v1';

    new AuthRoute(server, endpointPrefix);
    new CustomerRoute(server, endpointPrefix);
  }
}

export default PrimaryHandlerV1;