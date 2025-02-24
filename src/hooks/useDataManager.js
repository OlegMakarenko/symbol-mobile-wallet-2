import { useState } from 'react';

export const useDataManager = (callback, defaultData, onError) => {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState(defaultData);

    const call = (...args) => {
        return new Promise((resolve, reject) => {
            setIsLoading(true);
            setTimeout(async () => {
                try {
                    const data = await callback(...args);
                    setData(data);
                    resolve(data);
                } catch (error) {
                    if (onError) {
                        onError(error);
                    }
                    reject(error);
                }
                setIsLoading(false);
            });
        });
    };

    return [call, isLoading, data];
};
