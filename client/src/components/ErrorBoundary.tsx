import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { i18n } from '../lib/i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)


  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#101010] p-4">
          <div className="max-w-md w-full bg-[#151515] border border-red-500/20 rounded-xl p-6 text-center shadow-lg">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#dfdfdf] mb-2">
              {i18n.t('error.somethingWrong')}
            </h1>
            <p className="text-[#f3f3f398] mb-6">
              {i18n.t('error.unexpected')}
            </p>
            {this.state.error && (
              <div className="mb-4 p-3 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg text-left">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn btn-secondary"
              >
                {i18n.t('error.tryAgain')}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                {i18n.t('error.reloadPage')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

