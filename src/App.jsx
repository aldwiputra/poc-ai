import { Container } from '@mui/material';
import { useEffect, useState } from 'react';
import './App.css';
import { Button, Box, Grid, IconButton } from '@mui/material';
import ChatMessages from './ChatMessages';
import MicRecorder from 'mic-recorder-to-mp3';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MicIcon from '@mui/icons-material/Mic';
import {
  keyframes, // Add this import
  styled,
} from '@mui/system';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import axios from 'axios';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00a0a3',
    },
  },
});

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const ThinkingBubbleStyled = styled(MoreHorizIcon)`
  animation: ${pulse} 1.2s ease-in-out infinite;
  margin-bottom: -5px;
`;

const mockMessages = [
  {
    role: 'assistant',
    content: 'Hello, how can I help you today?',
    text: 'Hi, there!',
  },
];

function App() {
  // const theme = useTheme();
  const [isAudioResponse, setIsAudioResponse] = useState(false);
  const [messages, setMessages] = useState(mockMessages);
  // const [message, setMessage] = useState('');

  function filterMessageObjects(list) {
    return list.map(({ role, content }) => ({ role, content }));
  }

  // const handleSendMessage = async () => {
  //   if (message.trim() !== '') {
  //     // Send the message to the chat

  //     // Add the new message to the chat area
  //     setMessages((prevMessages) => [...prevMessages, { role: 'user', content: message, text: message, audio: null }]);

  //     // Clear the input field
  //     setMessage('');

  //     // Add thinking bubble
  //     setMessages((prevMessages) => [
  //       ...prevMessages,
  //       {
  //         role: 'assistant',
  //         content: <ThinkingBubble theme={theme} sx={{ marginBottom: '-5px' }} />,
  //         text: <ThinkingBubble theme={theme} sx={{ marginBottom: '-5px' }} />,
  //         key: 'thinking',
  //       },
  //     ]);

  //     // Create backend chat input
  //     let messageObjects = filterMessageObjects(messages);
  //     messageObjects.push({ role: 'user', content: message });

  //     // Create endpoint for just getting the completion
  //     try {
  //       // Send the text message to the backend
  //       // const response = await fetch('localhost:8000/test', {
  //       //   method: 'POST',
  //       //   mode: 'cors',
  //       //   headers: {
  //       //     'Content-Type': 'application/json',
  //       //   },
  //       //   body: {
  //       //     text: message,
  //       //     messages: messageObjects,
  //       //     isAudioResponse,
  //       //   },
  //       // });

  //       // Remove the thinking bubble
  //       setMessages((prevMessages) => {
  //         return prevMessages.filter((message) => message.key !== 'thinking');
  //       });
  //       // handleBackendResponse(response); // Add function call
  //     } catch (error) {
  //       console.error('Error sending text message:', error);
  //       alert(error);
  //     }
  //   }
  // };

  const handleBackendResponse = ({ data }, id = null) => {
    console.log(data);
    const generatedText = data.generated_text;
    const generatedAudio = data.generated_audio;
    const transcription = data.transcription;

    const audioElement = generatedAudio ? new Audio(`data:audio/mpeg;base64,${generatedAudio}`) : null;

    const AudioMessage = () => {
      useEffect(() => {
        if (audioElement) {
          audioElement.play();
        }
      });
      return (
        <span>
          {generatedText}{' '}
          {audioElement && (
            <IconButton
              aria-label='play-message'
              onClick={() => {
                audioElement.play();
              }}>
              <VolumeUpIcon style={{ cursor: 'pointer' }} fontSize='small' />
            </IconButton>
          )}
        </span>
      );
    };

    if (id) {
      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.map((message) => {
          if (message.id && message.id === id) {
            return {
              ...message,
              content: transcription,
            };
          }
          return message;
        });
        return [
          ...updatedMessages,
          {
            role: 'assistant',
            content: generatedText,
            audio: audioElement,
            text: <AudioMessage />,
          },
        ];
      });
    } else {
      // Simply add the response when no messageId is involved
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'assistant',
          content: generatedText,
          audio: audioElement,
          text: <AudioMessage />,
        },
      ]);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth='sm' sx={{ pt: 8 }}>
        <ChatHeader />
        <ChatMessages messages={messages} />
        <AudioControls
          isAudioResponse={isAudioResponse}
          filterMessageObjects={filterMessageObjects}
          messages={messages}
          setMessages={setMessages}
          handleBackendResponse={handleBackendResponse}
        />
        {/* <MessageInput
        message={message}
        setMessage={setMessage}
        isAudioResponse={isAudioResponse}
        handleSendMessage={handleSendMessage}
        handleBackendResponse={handleBackendResponse}
      />
      <ResponseFormatToggle isAudioResponse={isAudioResponse} setIsAudioResponse={setIsAudioResponse} /> */}
      </Container>
    </ThemeProvider>
  );
}

export default App;

const ChatHeader = () => {
  return (
    <Box sx={{ maxWidth: 200, marginInline: 'auto' }}>
      <img src='wemind-blue.svg' alt='logo' />
    </Box>
  );
};

const AudioControls = ({ isAudioResponse, handleBackendResponse, filterMessageObjects, messages, setMessages }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [player, setPlayer] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const startRecording = async () => {
    const newRecorder = new MicRecorder({ bitRate: 128 });

    try {
      await newRecorder.start();
      setIsRecording(true);
      setRecorder(newRecorder);
    } catch (e) {
      console.error(e);
      alert(e);
    }
  };

  const stopRecording = async () => {
    if (!recorder) return;

    try {
      const [buffer, blob] = await recorder.stop().getMp3();
      const audioFile = new File(buffer, 'voice-message.mp3', {
        type: blob.type,
        lastModified: Date.now(),
      });
      setPlayer(new Audio(URL.createObjectURL(audioFile)));
      setIsRecording(false);
      setAudioFile(audioFile); // Add this line
    } catch (e) {
      console.error(e);
      alert(e);
    }
  };

  const playRecording = () => {
    if (player) {
      player.play();
    }
  };

  return (
    <Container>
      <Box sx={{ width: '100%', mt: 4 }}>
        <Grid container spacing={2} justifyContent='flex-end'>
          <Grid item xs={12} md>
            <IconButton color='primary' aria-label='start recording' onClick={startRecording} disabled={isRecording}>
              <MicIcon />
            </IconButton>
          </Grid>
          <Grid item xs={12} md>
            <IconButton color='secondary' aria-label='stop recording' onClick={stopRecording} disabled={!isRecording}>
              <FiberManualRecordIcon />
            </IconButton>
          </Grid>
          <Grid item xs='auto'>
            <Button variant='contained' disableElevation onClick={playRecording} disabled={isRecording}>
              Play Recording
            </Button>
          </Grid>
          <SendButton
            audioFile={audioFile}
            isAudioResponse={isAudioResponse}
            filterMessageObjects={filterMessageObjects}
            handleBackendResponse={handleBackendResponse} // Add handleBackendResponse
            messages={messages}
            setMessages={setMessages}
          />
        </Grid>
      </Box>
    </Container>
  );
};

// const ResponseFormatToggle = ({ isAudioResponse, setIsAudioResponse }) => {
//   const handleToggleChange = (event) => {
//     setIsAudioResponse(event.target.checked);
//   };

//   return (
//     <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
//       <FormControlLabel
//         control={<Switch checked={isAudioResponse} onChange={handleToggleChange} color='primary' />}
//         label='Audio response'
//       />
//     </Box>
//   );
// };

const ThinkingBubble = () => {
  const theme = useTheme();
  return <ThinkingBubbleStyled theme={theme} sx={{ marginBottom: '-5px' }} />;
};

const SendButton = ({ audioFile, isAudioResponse, filterMessageObjects, messages, setMessages, handleBackendResponse }) => {
  const theme = useTheme();

  const uploadAudio = async () => {
    if (!audioFile) {
      console.log('No audio file to upload');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;

        // Add a unique id to the message to be able to update it later
        const messageId = new Date().getTime();

        // Create the message objects
        let messageObjects = filterMessageObjects(messages);

        // Add user's audio message to the messages array
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'user', content: '🎤 Audio Message', audio: new Audio(base64Audio), text: '🎤 Audio Message', id: messageId },
        ]);

        // Add thinking bubble
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: 'assistant',
            content: <ThinkingBubble theme={theme} sx={{ marginBottom: '-5px' }} />,
            text: <ThinkingBubble theme={theme} sx={{ marginBottom: '-5px' }} />,
            key: 'thinking',
          },
        ]);

        const response = await axios
          .post(
            'http://localhost:8000/test',
            {
              audio: base64Audio,
              messages: messageObjects,
              isAudioResponse,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )
          .catch((err) => {
            console.log(err);
          });

        // Remove the thinking bubble
        setMessages((prevMessages) => {
          return prevMessages.filter((message) => message.key !== 'thinking');
        });

        handleBackendResponse(response, messageId);
      };
      reader.readAsDataURL(audioFile);
    } catch (error) {
      console.error('Error uploading audio file:', error);
      alert(error);
    }
  };

  return (
    <Grid item xs='auto'>
      <Button
        variant='contained'
        color='primary'
        disableElevation
        onClick={uploadAudio}
        disabled={!audioFile}
        startIcon={<CloudUploadIcon />}>
        Send Audio
      </Button>
    </Grid>
  );
};

// const MessageInput = ({ message, setMessage, isAudioResponse, handleSendMessage }) => {
//   const handleInputChange = (event) => {
//     setMessage(event.target.value);
//   };
//   const handleKeyPress = (event) => {
//     if (event.key === 'Enter') {
//       handleSendMessage();
//     }
//   };

//   return (
//     <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
//       <TextField
//         variant='outlined'
//         fullWidth
//         label='Type your message'
//         value={message}
//         onChange={handleInputChange}
//         onKeyPress={handleKeyPress}
//       />
//       <IconButton color='primary' onClick={() => handleSendMessage(isAudioResponse)} disabled={message.trim() === ''}>
//         <SendIcon />
//       </IconButton>
//     </Box>
//   );
// };
