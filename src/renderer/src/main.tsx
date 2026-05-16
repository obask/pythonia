/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import './styles.css';
import 'highlight.js/styles/github-dark.css';

const root = document.getElementById('app');
if (!root) throw new Error('Root #app missing');
render(() => <App />, root);
