import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ThemeProvider } from "./ThemeContext";
import { UserProvider } from "./Context/UserContext";
import { UserDataProvider } from "./Context/UserData";

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <UserDataProvider>
          <div className="flex flex-col h-screen">
            {/* Pages */}
            <div className="flex-1">
              <RouterProvider router={router} />
            </div>
          </div>
        </UserDataProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;