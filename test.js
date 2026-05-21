class ClientSchedulePage
///...
function dayTabs(n = 7) {
    const days = [];
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
    for (let i = 0; i < n; i++) {
        const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        days.push(fmt.format(d));
    }
    return days;
}

export default function Schedule() {
    const navigate = useNavigate();
    const [dates] = useState(() => dayTabs(7));
    const [activeDate, setActiveDate] = useState(dates[0]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        scheduleApi
            .list({ date: activeDate })
            .then((r) => setSessions(r.data.data.filter(s => s.type === "group")))
            .finally(() => setLoading(false));
    }, [activeDate]);

    function handleBook(session) {
        navigate("/client/schedule/book/" + session.id, { state: { session } });
    }
}
///...



