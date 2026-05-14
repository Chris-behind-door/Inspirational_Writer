declare module 'react-native-markdown-package' {
  import { Component } from 'react';

  interface MarkdownProps {
    styles?: Record<string, any>;
    children?: string;
    [key: string]: any;
  }

  export default class Markdown extends Component<MarkdownProps> {}
}
