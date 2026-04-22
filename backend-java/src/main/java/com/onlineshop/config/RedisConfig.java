package com.onlineshop.config;

import com.onlineshop.events.RoomEventListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

@Configuration
public class RedisConfig {

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory cf) {
        return new StringRedisTemplate(cf);
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory cf,
            RoomEventListener listener) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(cf);
        MessageListenerAdapter adapter = new MessageListenerAdapter(listener, "onMessage");
        // Subscribe to room:* (Go channel format)
        container.addMessageListener(adapter, new PatternTopic("room:*"));
        return container;
    }
}
