import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';

import { initSentry } from './instrument';
import App from './App';

initSentry();

registerRootComponent(Sentry.wrap(App));
