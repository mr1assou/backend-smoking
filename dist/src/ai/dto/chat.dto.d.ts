export declare class ChatTurnDto {
    role: 'user' | 'assistant';
    content: string;
}
export declare class ChatDto {
    messages: ChatTurnDto[];
}
