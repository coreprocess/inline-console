import 'imports?jQuery=jquery!jquery.terminal';
import $ from 'jquery';
import _ from 'underscore';
import stringify from 'json-stringify-safe';
import React from 'react';
import { findDOMNode } from 'react-dom';

import 'jquery.terminal/css/jquery.terminal.css';

class TerminalWrapper {
  constructor(target, redirect) {
    // set instance variables
    this._terminal = null;
    this._origVerbs = null;

    // setup terminal
    const terminal = this._terminal = $(target).terminal(
      (command, terminal) => {
        if (command !== '') {
          let result = undefined;
          let succeeded = false;
          try {
            result = window.eval(command);
            succeeded = true;
          }
          catch(error) {
            terminal.exception(error);
          }
          if(succeeded) {
            terminal.echo(stringify(result));
          }
        }
      }, {
        greetings: 'Console',
        name: 'inline_console',
        prompt: '> ',
        scrollOnEcho: false,
      }
    );

    // redirect native console output
    if(redirect) {
      const origVerbs = this._origVerbs = { };
      ['debug', 'log', 'info', 'warn', 'error'].forEach(function (verb) {
        if(typeof console[verb] != 'undefined') {
          origVerbs[verb] = console[verb];
          console[verb] = (function (method, verb) {
            return function (...args) {
              (verb == 'error'
                ? terminal.error
                : terminal.echo)
                (verb + ': ' + args.map(i => stringify(i)).join(' '));
              return method(...args);
            };
          })(console[verb].bind(console), verb);
        }
      });
    }
  }

  destroy(purge) {
    // unwire console verbse
    if(this._origVerbs) {
      for(let verb of _.keys(this._origVerbs)) {
        console[verb] = this._origVerbs[verb];
      }
      this._origVerbs = null;
    }

    // destroy terminal
    if(this._terminal) {
      this._terminal.destroy();
      if(purge) {
        this._terminal.purge();
      }
      this._terminal = null;
    }
  }

  echo(...args) {
    if(!this._terminal) {
      throw new Error('inline console not initialized');
    }
    this._terminal.echo(args.map(i => stringify(i)).join(' '));
  }

  error(...args) {
    if(!this._terminal) {
      throw new Error('inline console not initialized');
    }
    this._terminal.error(args.map(i => stringify(i)).join(' '));
  }
};

export default class InlineConsole extends React.Component {
  componentDidMount() {
    // create terminal
    this._console = new TerminalWrapper(
      findDOMNode(this),
      !!this.props.redirect
    );
  }

  componentWillReceiveProps(props) {
    // re-create terminal
    if( (!!this.props.redirect) != (!!props.redirect) ) {
      this._console.destroy();
      this._console = new TerminalWrapper(
        findDOMNode(this),
        !!props.redirect
      );
    }
  }

  componentWillUnmount() {
    // destroy terminal
    this._console.destroy();
  }

  render() {
    // render container element
    return (<div/>);
  }
};
