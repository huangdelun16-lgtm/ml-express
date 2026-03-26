import * as Linking from 'expo-linking';
import LoggerService from './LoggerService';

class LinkingService {
  private navigationRef: any = null;

  setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  async handleInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) this.handleDeepLink(url);
  }

  setupURLListener() {
    return Linking.addEventListener('url', ({ url }) => this.handleDeepLink(url));
  }

  handleDeepLink(url: string) {
    LoggerService.debug('Deep link:', url);
    if (!this.navigationRef) return;
    const { path, queryParams } = Linking.parse(url);
    
    if (path === 'order' && queryParams?.id) {
      this.navigationRef.navigate('TrackOrder', { orderId: queryParams.id });
    }
  }
}

export const linkingService = new LinkingService();
