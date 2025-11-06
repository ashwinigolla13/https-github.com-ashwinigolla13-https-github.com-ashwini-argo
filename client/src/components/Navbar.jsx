import { Link, useNavigate } from "react-router-dom";
import { Navbar, Nav, NavDropdown, Container, Button } from "react-bootstrap";
import "./Navbar.css";
import logo from "../assets/logo.png"

const NavigationBar = ({ auth, setAuth }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");
        setAuth(false);
        navigate("/login");
    };

    return (
        <Navbar expand="lg" className="custom-navbar py-0">
            <>
                <Navbar.Brand as={Link} to="/" className="logo">
                <img src={logo} alt="Logo" className="logo-img rounded-circle" height={60} width={60}/> AgriAssist
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto nav-links">
                        <Nav.Link as={Link} to="/">Home</Nav.Link>
                        {auth && <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>}
                        {auth && <Nav.Link as={Link} to="/predict">Crop Prediction</Nav.Link>}
                        {auth && <Nav.Link as={Link} to="/community">Community</Nav.Link>}
                        <Nav.Link as={Link} to="/contact">Contact</Nav.Link>

                        {auth ? (
                            <NavDropdown title="Profile" id="basic-nav-dropdown" className="profile-dropdown">
                                <NavDropdown.Item as={Link} to="#profile">My Profile</NavDropdown.Item>
                                <NavDropdown.Divider />
                                <NavDropdown.Item>
                                    <Button variant="danger" onClick={handleLogout} className="logout-btn">Logout</Button>
                                </NavDropdown.Item>
                            </NavDropdown>
                        ) : (
                            <>
                                <Nav.Link as={Link} to="/login">Login</Nav.Link>
                                <Nav.Link as={Link} to="/signup">Signup</Nav.Link>
                            </>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </>
        </Navbar>
    );
};

export default NavigationBar;
