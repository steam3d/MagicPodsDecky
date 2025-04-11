import { VFC, useEffect, useState, useRef  } from 'react';
import { Backend } from "../backend";
import { call } from '@decky/api';

export const LogRouter: VFC<{ backend: Backend }> = ({ backend }) => {

    const [logValue, setLogValue] = useState<string>()

    const containerStyle:React.CSSProperties = {

        height: "100vh",
        overflowY: "auto",
        overflowX: "auto",
        paddingLeft: "0px",
        paddingRight:"0px",
        paddingTop: "40px",
        paddingBottom:"44px",
        whiteSpace: 'pre',
        fontFamily:"monospace",
        fontSize: "12px",
        lineHeight: "12px"

    };
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        backend.logDebug("LogRouter");
        const getLog = async () => {
            let output = await call<[], string>("read_logs");
            setLogValue(output);}

            setTimeout(() => {
                if (divRef.current) {
                    divRef.current.scrollTop = divRef.current.scrollHeight;
                  }
              }, 250);

        getLog();
    },[]);

    return (
        <div style={containerStyle} ref={divRef}>
            {logValue}
        </div>
    );
};