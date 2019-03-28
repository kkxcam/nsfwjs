import React, { Component } from 'react'
import logo from './logo.svg'
import ir from './ir.svg'
import tflogo from './tflogo.jpg'
import './App.css'
import * as nsfwjs from 'nsfwjs'
import Dropzone from 'react-dropzone'
import Webcam from 'react-webcam'

// components
import Underdrop from './components/Underdrop'
import Loading from './components/Loading'

const blurred = { filter: 'blur(30px)', WebkitFilter: 'blur(30px)' }
const clean = {}
const loadingMessage = 'Loading NSFWJS Model'
const dragMessage = 'Drag and drop an image to check'
const camMessage = 'Cam active'
const DETECTION_PERIOD = 1000

class App extends Component {
  state = {
    model: null,
    graphic: logo,
    titleMessage: 'Please hold, the model is loading...',
    message: loadingMessage,
    predictions: [],
    droppedImageStyle: { opacity: 0.4 },
    blurNSFW: true,
    enableWebcam: false,
    loading: true
  }
  componentDidMount() {
    // Load model from public
    nsfwjs.load('/model/').then(model => {
      this.setState({
        model,
        titleMessage: dragMessage,
        message: 'Ready to Classify',
        loading: false
      })
    })
  }

  _refWeb = webcam => {
    this.webcam = webcam
  }

  // terrible race condition fix :'(
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  detectBlurStatus = (className, blurNSFW = this.state.blurNSFW) => {
    let droppedImageStyle = clean
    if (blurNSFW) {
      switch (className) {
        case 'Hentai':
        case 'Porn':
        case 'Sexy':
          droppedImageStyle = blurred
      }
    }
    return droppedImageStyle
  }

  checkContent = async () => {
    // Sleep bc it's grabbing image before it's rendered
    // Not really a problem of this library
    await this.sleep(100)
    const img = this.refs.dropped
    const predictions = await this.state.model.classify(img)
    let droppedImageStyle = this.detectBlurStatus(predictions[0].className)
    this.setState({
      message: `Identified as ${predictions[0].className}`,
      predictions,
      droppedImageStyle
    })
  }

  setFile = file => {
    // Currently not sending URL strings, but good for future.
    if (typeof file === 'string') {
      // using a sample
      this.setState({ graphic: file }, this.checkContent)
    } else {
      // drag and dropped
      const reader = new FileReader()
      reader.onload = e => {
        this.setState({ graphic: e.target.result }, this.checkContent)
      }

      reader.readAsDataURL(file)
    }
  }

  onDrop = (accepted, rejected) => {
    if (rejected.length > 0) {
      window.alert('JPG, PNG, GIF only plz')
    } else {
      let droppedImageStyle = this.state.blurNSFW ? blurred : clean
      this.setState({
        message: 'Processing...',
        droppedImageStyle
      })
      this.setFile(accepted[0])
    }
  }

  _renderPredictions = () => {
    return (
      <div id="predictions">
        <ul>
          {this.state.predictions.map(prediction => (
            <li id={prediction.className}>
              {prediction.className} -{' '}
              {(prediction.probability * 100).toFixed(2)}%
            </li>
          ))}
        </ul>
      </div>
    )
  }

  detectWebcam = async () => {
    await this.sleep(100)

    const video = document.querySelectorAll('.captureCam')
    // assure video is still shown
    if (video[0]) {
      const predictions = await this.state.model.classify(video[0])
      let droppedImageStyle = this.detectBlurStatus(predictions[0].className)
      this.setState({
        message: `Identified as ${predictions[0].className}`,
        predictions,
        droppedImageStyle
      })
      setTimeout(this.detectWebcam, DETECTION_PERIOD)
    }
  }

  blurChange = checked => {
    // Check on blurring
    let droppedImageStyle = clean
    if (this.state.predictions.length > 0) {
      droppedImageStyle = this.detectBlurStatus(
        this.state.predictions[0].className,
        checked
      )
    }

    this.setState({
      blurNSFW: checked,
      droppedImageStyle
    })
  }

  _renderInterface = () => {
    const maxWidth = window.innerWidth
    const maxHeight = window.innerHeight

    const videoConstraints = {
      width: { ideal: maxWidth, max: maxWidth },
      height: { ideal: maxHeight, max: maxHeight },
      facingMode: 'environment'
    }
    if (this.state.enableWebcam) {
      return (
        <Webcam
          id="capCam"
          className="captureCam"
          style={this.state.droppedImageStyle}
          width={maxWidth}
          audio={false}
          ref={this._refWeb}
          videoConstraints={videoConstraints}
        />
      )
    } else {
      return (
        <Dropzone
          id="dropBox"
          accept="image/jpeg, image/png, image/gif"
          className="photo-box"
          onDrop={this.onDrop.bind(this)}
        >
          <img
            src={this.state.graphic}
            style={this.state.droppedImageStyle}
            alt="drop your file here"
            className="dropped-photo"
            ref="dropped"
          />
        </Dropzone>
      )
    }
  }

  _camChange = e => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.alert("Sorry, your browser doesn't seem to support camera access.")
      return
    }
    this.detectWebcam()
    this.setState({
      enableWebcam: !this.state.enableWebcam,
      predictions: [],
      droppedImageStyle: {},
      titleMessage: this.state.enableWebcam ? dragMessage : camMessage
    })
  }

  render() {
    return (
      <div className="App">
        <header>
          <img src={logo} className="App-logo" alt="logo" />
          <h1>Client-side indecent content checking</h1>
          <div className="snippet">
            <p>Powered by</p>
            <a href="https://js.tensorflow.org/" targe="_blank">
              <img src={tflogo} id="tflogo" alt="TensorflowJS Logo" />
            </a>
          </div>
        </header>
        <main>
          <div>
            <div id="overDrop">
              <p id="topMessage">{this.state.titleMessage}</p>
            </div>
            {this._renderInterface()}
            <Underdrop
              camChange={this._camChange}
              camStatus={this.state.enableWebcam}
              blurChange={this.blurChange}
              blurStatus={this.state.blurNSFW}
            />
          </div>
          <Loading showLoading={this.state.loading} />
          <div id="results">
            <p>{this.state.message}</p>
            {this._renderPredictions()}
          </div>
        </main>
        <footer>
          <div>Copyright Now(ish)</div>
          <div>
            <a href="https://github.com/infinitered/nsfwjs">NSFWJS GitHub</a>
          </div>
          <div>
            <a href="https://github.com/gantman/nsfw_model">Model Repo</a>
          </div>
          <div>
            <a href="https://shift.infinite.red/avoid-nightmares-nsfw-js-ab7b176978b1">
              Blog Post
            </a>
          </div>
          <div>
            <a href="https://infinite.red">
              <img src={ir} alt="infinite red logo" />
            </a>
          </div>
        </footer>
      </div>
    )
  }
}

export default App
