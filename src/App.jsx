import { useState } from 'react';

export default function EscanerMóvil() {
  const [resultado, setResultado] = useState('');
  const [procesando, setProcesando] = useState(false);

  const procesarCaptura = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setProcesando(true);
    setResultado('');

    // Convertir a Base64 puro para el cuerpo del JSON
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];

      try {
        // Llamada a nuestra función serverless interna
        const response = await fetch('/api/analizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Data,
            mimeType: file.type
          })
        });

        const data = await response.json();
        if (response.ok) {
          setResultado(data.resultado);
        } else {
          setResultado(`Error: ${data.error}`);
        }
      } catch (err) {
        setResultado("Error de conexión con el servidor de escaneo.");
      } finally {
        setProcesando(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Escáner de Mini App</h2>
      
      <label style={{
        display: 'inline-block', padding: '12px 24px', backgroundColor: '#0070f3',
        color: '#fff', borderRadius: '7px', cursor: 'pointer', fontWeight: 'bold'
      }}>
        {procesando ? "Analizando..." : "Escanear / Subir Imagen"}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={procesarCaptura} 
          disabled={procesando}
          style={{ display: 'none' }} 
        />
      </label>

      {resultado && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f4f4f4', borderRadius: '5px', textAlign: 'left' }}>
          <strong>Análisis del Escáner:</strong>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{resultado}</p>
        </div>
      )}
    </div>
  );
}
