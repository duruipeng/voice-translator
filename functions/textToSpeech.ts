export const synthesizeSpeech = async (props: any) => {
    const {translation, inputValue} = props;
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;
  
    const body = {
      input: {ssml: translation},
      voice: {
        languageCode: 'zh-CN',
        name: 'cmn-CN-Wavenet-B',
        ssmlGender: 'NEUTRAL',
      },
      audioConfig: {
        audioEncoding: 'LINEAR16',
        speakingRate: 1.0,
      },
    };
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-goog-api-key": inputValue,
      },
      body: JSON.stringify(body),
    });
  
    if (!response.ok) {
      throw new Error('Failed to synthesize speech');
    }
  
    const data = await response.json();
    return data.audioContent;
  };