import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function NodeConfigDetail() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/settings/alerts", { replace: true });
    }, [navigate]);

    return null;
}
