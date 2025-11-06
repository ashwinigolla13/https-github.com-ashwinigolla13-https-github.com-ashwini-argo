import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/loading.json"; // your loading Lottie JSON here
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const API_BASE_URL = "https://argo-flask-backend.onrender.com"; // Updated URL

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const soilTypes = ["Sandy", "Loamy", "Clay", "Silty", "Peaty", "Chalky"];
const idealValues = {
  N: 50,
  P: 40,
  K: 30,
  pH: 6.5,
  temperature: 25,
  humidity: 60,
  rainfall: 100,
};

const fetchWeather = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
    ); // units=metric for Celsius

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to fetch weather data");
    }

    const data = await response.json();

    // OpenWeatherMap provides current weather, but rainfall might be for the last 1 hour or 3 hours.
    // We'll estimate based on their 'rain' object if available.
    // If 'rain' object is not present, assume 0 for simplicity.
    const rainfallLastHour = data.rain && data.rain["1h"] ? data.rain["1h"] : 1; // rainfall in mm for last 1 hour

    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      rainfall: rainfallLastHour, // Using 1-hour rainfall
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    alert("Could not fetch local weather. Please enter manually.");
    return {
      temperature: "", // Clear fields so user can input manually
      humidity: "",
      rainfall: "",
    };
  }
};


async function fetchCropImage(crop) {
  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${crop}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1`
  );
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].urls.small;
  }
  return null;
}

// Function to fetch predictions from your backend
const fetchPredictions = async (inputs) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        N: parseFloat(inputs.N),
        P: parseFloat(inputs.P),
        K: parseFloat(inputs.K),
        temperature: parseFloat(inputs.temperature),
        humidity: parseFloat(inputs.humidity),
        ph: parseFloat(inputs.pH), // pH is 'ph' in your backend
        rainfall: parseFloat(inputs.rainfall),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Something went wrong with prediction");
    }

    const data = await response.json();
    const top3Crops = data.top_3_crops;

    
    const mockDetailedCropData = (cropName, index) => {
      // This is mock data, in a real app, your backend might return this too.
      const baseSuitability = 90 - (index * 10); // Decreasing suitability
      const baseYield = 3.5 - (index * 0.5);
      const basePrice = 20 - (index * 2);

      return {
        crop: cropName,
        score: baseSuitability / 100, // Convert to score
        expectedYield: baseYield,
        price: basePrice,
        reasons: [
          `Optimal conditions for ${cropName}.`,
          `Good nutrient balance.`,
          `Favorable market outlook.`,
        ],
        npk: {
          N: idealValues.N * (1 - (index * 0.05)), // Slightly deviate from ideal
          P: idealValues.P * (1 - (index * 0.05)),
          K: idealValues.K * (1 - (index * 0.05)),
        },
        suitability: baseSuitability,
      };
    };

    return top3Crops.map((crop, index) => mockDetailedCropData(crop, index));

  } catch (error) {
    console.error("Error fetching predictions:", error);
    alert(`Prediction failed: ${error.message}`);
    return []; // Return empty array on error
  }
};

// Function to fetch history from your backend
const fetchHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/history`);
    if (!response.ok) {
      throw new Error("Failed to fetch history");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
};

// Function to delete history from your backend
const deleteHistoryRecord = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/delete-history/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete record");
    }
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error deleting history record:", error);
    return false;
  }
};


const CropPrediction = () => {
  // Form data state
  const [formData, setFormData] = useState({
    temperature: "",
    humidity: "",
    rainfall: "",
    soilType: "",
    N: "",
    P: "",
    K: "",
    pH: "",
  });

  // Loading states
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  // Prediction and selection states
  const [predictions, setPredictions] = useState([]);
  const [selectedCropIndex, setSelectedCropIndex] = useState(null);
  const [cropImages, setCropImages] = useState({}); // State to store crop images

  // Soil test file state
  const [soilTestFile, setSoilTestFile] = useState(null);

  // Saved predictions state (now directly loaded from backend history)
  const [savedPredictions, setSavedPredictions] = useState([]);

  // Auto-detect location and fetch weather on component mount
  useEffect(() => {
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const weather = await fetchWeather(latitude, longitude);
        setFormData((prev) => ({
          ...prev,
          temperature: weather.temperature,
          humidity: weather.humidity,
          rainfall: weather.rainfall,
        }));
        setLoadingWeather(false);
      },
      // Handle error or denial of location access
      (error) => {
        console.error("Geolocation error:", error);
        alert("Location access denied or failed. Please enter weather details manually.");
        setLoadingWeather(false);
        // Optionally, clear the fields if location couldn't be obtained
        setFormData((prev) => ({
          ...prev,
          temperature: "",
          humidity: "",
          rainfall: "",
        }));
      }
    );
  }, []);

  // Handle soil test file upload (logic remains client-side as it's optional)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSoilTestFile(file.name);
      // to parse the file and autofill nutrient fields (N, P, K, pH).
    }
  };

  // Function to run crop prediction
  const runPrediction = async () => {
    // Basic validation
    const requiredInputs = ["N", "P", "K", "temperature", "humidity", "pH", "rainfall"];
    const missingInputs = requiredInputs.filter(key => !formData[key] || isNaN(parseFloat(formData[key])));

    if (missingInputs.length > 0) {
      alert(`Please fill in all numerical fields: ${missingInputs.join(", ")}`);
      return;
    }
    if (!formData.soilType) {
        alert("Please select a soil type.");
        return;
    }


    setLoadingPrediction(true);
    const result = await fetchPredictions(formData);
    setPredictions(result);
    setSelectedCropIndex(result.length > 0 ? 0 : null); // Select the first crop if available

    // Fetch images for each predicted crop asynchronously
    const images = {};
    if (result.length > 0) {
        await Promise.all(
            result.map(async (cropObj) => {
                const imgUrl = await fetchCropImage(cropObj.crop);
                images[cropObj.crop] = imgUrl;
            })
        );
    }
    setCropImages(images);

    setLoadingPrediction(false);
    // After prediction, refresh history to show the newly saved prediction
    loadSavedPredictions();
  };

  // Function to save the current prediction (No longer saving to localStorage)
  // The backend already saves the prediction in the /predict endpoint.
  const saveCurrentPrediction = () => {
    alert("Prediction is automatically saved to history after calculation!");
  };

  // Function to load saved predictions from the backend
  const loadSavedPredictions = async () => {
    const historyData = await fetchHistory();
    // Transform backend history data to match frontend's 'savedPredictions' structure
    // This is a crucial step to ensure the history table works correctly
    const formattedHistory = historyData.map(record => ({
      id: record.id, // Ensure ID is passed for deletion
      timestamp: record.timestamp,
      input: {
        N: record.N,
        P: record.P,
        K: record.K,
        temperature: record.temperature,
        humidity: record.humidity,
        pH: record.ph, // Note: pH from backend is 'ph'
        rainfall: record.rainfall,
        // soilType is not saved in backend currently, so we can't display it from history
        soilType: "N/A" // Placeholder for now
      },
      prediction: [{
        crop: record.predicted_crop,
        score: null, // Backend doesn't return score for individual crops in history
        expectedYield: null,
        price: null,
        reasons: [],
        npk: { N: record.N, P: record.P, K: record.K }, // Use input NPK from history
        suitability: null,
      }],
      top_3_crops: record.top_3_crops // Store this for potential display in history table
    }));
    setSavedPredictions(formattedHistory);
  };

  // Load saved predictions from backend on component mount
  useEffect(() => {
    loadSavedPredictions();
  }, []);

  // Handle deleting a history record
  const handleDeleteHistory = async (id) => {
    if (window.confirm("Are you sure you want to delete this prediction history record?")) {
      const success = await deleteHistoryRecord(id);
      if (success) {
        alert("Record deleted!");
        loadSavedPredictions(); // Refresh history after deletion
      } else {
        alert("Failed to delete record.");
      }
    }
  };


  // Prepare data for the NPK chart based on the selected crop
  const chartData =
    selectedCropIndex !== null
      ? ["N", "P", "K"].map((param) => ({
            parameter: param,
            actual: predictions[selectedCropIndex]?.npk[param] || 0,
            ideal: idealValues[param],
          }))
      : [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Crop Prediction</h1>

      {/* Environmental Conditions Section */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">Environmental Conditions</h2>
        {loadingWeather ? (
          <div className="flex justify-center">
            <Lottie animationData={loadingAnimation} style={{ height: 100 }} />
            <p>Fetching local weather...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex flex-col">
              Temperature (°C)
              <input
                type="number"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({ ...formData, temperature: e.target.value })
                }
                className="border p-2 rounded hover:ring-2 hover:ring-green-400"
                placeholder="e.g., 27"
              />
            </label>
            <label className="flex flex-col">
              Humidity (%)
              <input
                type="number"
                value={formData.humidity}
                onChange={(e) =>
                  setFormData({ ...formData, humidity: e.target.value })
                }
                className="border p-2 rounded hover:ring-2 hover:ring-green-400"
                placeholder="e.g., 65"
              />
            </label>
            <label className="flex flex-col">
              Rainfall (mm)
              <input
                type="number"
                value={formData.rainfall}
                onChange={(e) =>
                  setFormData({ ...formData, rainfall: e.target.value })
                }
                className="border p-2 rounded hover:ring-2 hover:ring-green-400"
                placeholder="e.g., 120"
              />
            </label>
          </div>
        )}
      </section>

      {/* Soil Information Section */}
      <section className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-xl font-semibold">Soil Information</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {soilTypes.map((soil) => (
            <div
              key={soil}
              className={`cursor-pointer p-4 rounded shadow text-center select-none ${
                formData.soilType === soil
                  ? "border-4 border-green-600 bg-green-50"
                  : "border"
              }`}
              onClick={() => setFormData({ ...formData, soilType: soil })}
            >
              {soil}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {["N", "P", "K", "pH"].map((param) => (
            <label key={param} className="flex flex-col">
              {param} Level
              <input
                type="number"
                step="any"
                value={formData[param]}
                onChange={(e) =>
                  setFormData({ ...formData, [param]: e.target.value })
                }
                className="border p-2 rounded hover:ring-2 hover:ring-green-400"
                placeholder={param === "pH" ? "e.g., 6.5" : "e.g., 50"}
              />
            </label>
          ))}
        </div>

      </section>

      {/* Predict Button */}
      <div className="text-center">
        <button
          onClick={runPrediction}
          disabled={loadingPrediction}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded shadow transition disabled:opacity-50"
        >
          {loadingPrediction ? "Predicting..." : "Predict Crops"}
        </button>
      </div>

      {/* Predictions Section */}
      {predictions.length > 0 && (
        <section className="bg-white p-6 rounded shadow space-y-6">
          <h2 className="text-xl font-semibold">Top Crop Recommendations</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {predictions.map((pred, i) => (
              <div
                key={pred.crop}
                onClick={() => setSelectedCropIndex(i)}
                className={`cursor-pointer border rounded shadow p-4 hover:shadow-lg transition ${
                  selectedCropIndex === i
                    ? "border-green-600 bg-green-50"
                    : "border-gray-300"
                }`}
              >
                <img
                  src={cropImages[pred.crop] || "/placeholder-image.jpg"}
                  alt={pred.crop}
                  className="w-full h-40 object-cover rounded"
                />

                <h3 className="text-lg font-bold mt-2">{pred.crop}</h3>
                {/* Displaying score, yield, price will depend on whether your backend returns them for top 3 */}
                {pred.suitability && <p>Suitability: {Math.round(pred.suitability)}%</p>}
                {pred.expectedYield && <p>Expected Yield: {pred.expectedYield} tons/ha</p>}
                {pred.price && <p>Market Price: ₹{pred.price}/kg</p>}
              </div>
            ))}
          </div>

          {/* Detailed information for selected crop */}
          {selectedCropIndex !== null && (
            <>
              {/* Why this crop? */}
              <div className="bg-green-50 p-4 rounded mt-6">
                <h4 className="font-semibold text-green-700 mb-2">
                  Why {predictions[selectedCropIndex].crop}?
                </h4>
                <ul className="list-disc list-inside text-gray-700">
                  {predictions[selectedCropIndex].reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Nutrient Chart */}
              <div className="my-6 w-full h-64">
                <h4 className="font-semibold mb-2">Nutrient Levels (Actual vs. Ideal)</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20 }}>
                    <XAxis dataKey="parameter" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="actual" fill="#34D399" name="Actual" />
                    <Bar dataKey="ideal" fill="#6EE7B7" name="Ideal" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Suitability Gauge */}
              {predictions[selectedCropIndex].suitability && (
                <div className="w-32 mx-auto">
                  <CircularProgressbar
                    value={predictions[selectedCropIndex].suitability}
                    text={`${Math.round(
                      predictions[selectedCropIndex].suitability
                    )}%`}
                    styles={buildStyles({
                      textColor: "#059669",
                      pathColor: "#10B981",
                      trailColor: "#D1FAE5",
                    })}
                  />
                  <p className="text-center mt-2 text-green-700 font-semibold">
                    Suitability Score
                  </p>
                </div>
              )}
            </>
          )}

          {/* Save Prediction - now just a message since backend saves automatically */}
          <div className="text-center mt-4">
            <button
              onClick={saveCurrentPrediction}
              className="bg-gray-400 text-white font-bold py-2 px-4 rounded shadow cursor-not-allowed"
              disabled
            >
              Prediction Auto-Saved to History
            </button>
          </div>
        </section>
      )}

      {/* Past Predictions Section */}
      {savedPredictions.length > 0 && (
        <section className="bg-white p-6 rounded shadow mt-8">
          <h2 className="text-xl font-semibold mb-4">Past Predictions</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-green-100">
                  <th className="border border-gray-300 p-2">Date</th>
                  <th className="border border-gray-300 p-2">Soil Type</th> 
                  <th className="border border-gray-300 p-2">Top Crop</th>
                  <th className="border border-gray-300 p-2">All Predicted Crops</th>
                  <th className="border border-gray-300 p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedPredictions
                  .map((pred, i) => (
                    <tr key={pred.id || i} className="hover:bg-green-50">
                      <td className="border border-gray-300 p-2">
                        {new Date(pred.timestamp).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {pred.input.soilType}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {pred.prediction[0].crop}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {pred.top_3_crops}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <button
                          onClick={() => handleDeleteHistory(pred.id)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default CropPrediction;
