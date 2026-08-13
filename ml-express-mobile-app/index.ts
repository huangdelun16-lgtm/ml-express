import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';

import { initSentry } from './instrument';
import { installProductionConsoleGate } from './services/LoggerService';
import App from './App';

initSentry();
installProductionConsoleGate();

registerRootComponent(Sentry.wrap(App));
